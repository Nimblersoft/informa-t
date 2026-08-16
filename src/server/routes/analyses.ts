// # Spec: docs/specs/sse-analysis.md

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import {
  ANALYSIS_PIPELINE_VERSION,
  ANALYSIS_PROMPT_VERSION,
  type AnalysisEventMap,
  type AnalysisEventName,
  type AnalysisEventMeta,
} from "../../shared/analysis-events";
import { parseAnalysisInput, type AnalysisInput } from "../../shared/contracts";
import { analyzeText, type AnalyzeTextOptions } from "../pipeline/analyze-text";
import { ArticleFetchError, fetchArticleText, type ArticleFetchOptions } from "../article-fetch";
import { PROPOSAL_MODELS } from "../config/models";
import { AUDIT_RETENTION_MS, persistClaimExtractionAudit, type AuditDatabase } from "../audit/claim-extraction-audit";
import { createAiSearchProvider, type AiSearchNamespaceBinding, type AiSearchProvider } from "../providers/ai-search";
import { OpenRouterClient, type OpenRouterModelProvider } from "../providers/openrouter";
import type { WorkersAiBinding } from "../providers/workers-ai";

export interface AnalysisRouteEnv {
  AI: WorkersAiBinding;
  AI_SEARCH: AiSearchNamespaceBinding;
  BROWSER: BrowserRun;
  OPENROUTER_API_KEY?: string;
  AUDIT_DB?: AuditDatabase;
}

export interface AnalysisRouteDependencies {
  ai: WorkersAiBinding;
  search: Pick<AiSearchProvider, "searchEvidence">;
  openRouter?: OpenRouterModelProvider;
  now?: () => number;
  analyze?: typeof analyzeText;
  fetchArticle?: (url: string, options: ArticleFetchOptions) => Promise<string>;
  audit?: AuditDatabase;
}

export const analysisRoutes = createAnalysisRoutes();

export function createAnalysisRoutes(dependencies?: AnalysisRouteDependencies): Hono<{ Bindings: AnalysisRouteEnv }> {
  const routes = new Hono<{ Bindings: AnalysisRouteEnv }>();

  routes.post("/analyses", async (context) => {
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, 400);
    }

    const parsedInput = parseAnalysisInput(body);
    if (parsedInput.error) return context.json({ error: parsedInput.error }, 400);
    if (!parsedInput.input) return context.json({ error: "Proporciona exactamente uno de los campos \"text\" o \"url\"." }, 400);
    const input: AnalysisInput = parsedInput.input;

    const env = context.env;
    const resolved: AnalysisRouteDependencies = dependencies ?? {
      ai: env.AI,
      search: createAiSearchProvider({ binding: env.AI_SEARCH }),
      openRouter: new OpenRouterClient({ env }),
      fetchArticle: (url, options) => fetchArticleText(url, { ...options, browser: env.BROWSER }),
    };
    const now = resolved.now ?? Date.now;
    const runAnalysis = resolved.analyze ?? analyzeText;
    const analysisId = `analysis-${crypto.randomUUID()}`;

    context.header("Content-Encoding", "identity");
    return streamSSE(context, async (stream) => {
      const controller = new AbortController();
      let startedAt = now();
      const auditDegradations: string[] = [];
      const abort = () => controller.abort();
      stream.onAbort(abort);
      context.req.raw.signal.addEventListener("abort", abort, { once: true });

      const write = async <Name extends AnalysisEventName>(name: Name, data: Omit<AnalysisEventMap[Name], keyof AnalysisEventMeta>, overrides?: Partial<AnalysisEventMeta>) => {
        if (controller.signal.aborted || stream.aborted) throw new DOMException("La solicitud fue cancelada.", "AbortError");
        const meta: AnalysisEventMeta = {
          pipelineVersion: ANALYSIS_PIPELINE_VERSION,
          promptVersion: ANALYSIS_PROMPT_VERSION,
          durationMs: Math.max(0, now() - startedAt),
          usage: null,
          retries: overrides?.retries ?? 0,
          degradations: overrides?.degradations ?? [],
        };
        await stream.writeSSE({
          event: name,
          id: `${analysisId}-${name}-${now()}`,
          data: JSON.stringify({ ...meta, ...data }),
        });
      };

      try {
        await write("analysis.started", {
          analysisId,
          textLength: input.kind === "text" ? input.text.length : 0,
          inputType: input.kind,
          ...(input.kind === "url" ? { sourceUrl: input.url } : {}),
        });
        startedAt = now();

        let text = input.kind === "text" ? input.text : "";
        if (input.kind === "url") {
          try {
            text = await (resolved.fetchArticle ?? ((url, options) => fetchArticleText(url, options)))(input.url, { signal: controller.signal });
          } catch (error) {
            const articleError = error instanceof ArticleFetchError
              ? error
              : new ArticleFetchError("No fue posible leer el artículo.", "transport");
            const message = articleError.message;
            const diagnostic = `url-extraction:${articleError.diagnosticCategory}`;
            await write("analysis.completed", {
              analysisId,
              status: "failed",
              claims: [],
              limitations: [message],
              traceEventIds: [],
            }, { degradations: [message, diagnostic] });
            return;
          }
        }

        const options: AnalyzeTextOptions = {
          text,
          ai: resolved.ai,
          search: resolved.search,
          openRouter: resolved.openRouter,
          signal: controller.signal,
          now,
          onProgress: async (progress) => {
            if (progress.type === "claim.extracted") {
              const auditDb = resolved.audit ?? env?.AUDIT_DB;
              try {
                await withTimeout(
                  persistClaimExtractionAudit(auditDb, progress.claims.map((claim, claimIndex) => ({
                    analysisId,
                    claimIndex,
                    traceEventId: progress.traceEvent.id,
                    claimText: claim.verbatimText,
                    extractorDecision: claim.extractionDecision,
                    pipelineDisposition: claim.pipelineDisposition,
                    rationale: claim.rationale ?? "",
                    provider: progress.provenance.provider,
                    modelId: progress.provenance.modelId,
                    promptVersion: ANALYSIS_PROMPT_VERSION,
                    pipelineVersion: ANALYSIS_PIPELINE_VERSION,
                    canonicalHash: progress.traceEvent.canonicalHash,
                    degradations: progress.degradations ?? [],
                    createdAt: now(),
                    expiresAt: now() + AUDIT_RETENTION_MS,
                  }))),
                  5_000,
                );
              } catch {
                const limitation = "La auditoría interna no está disponible; la evidencia y las propuestas continúan, pero el análisis termina como parcial.";
                auditDegradations.push(limitation);
              }
              await write("claim.extracted", {
                analysisId,
                claims: progress.claims,
                provenance: progress.provenance,
                traceEventId: progress.traceEventId,
                traceEvent: progress.traceEvent,
              }, { retries: progress.retries, degradations: [...(progress.degradations ?? []), ...auditDegradations] });
            } else if (progress.type === "evidence.retrieved") {
              await write("evidence.retrieved", {
                analysisId,
                claim: progress.claim,
                excerpts: progress.excerpts,
                traceEventId: progress.traceEventId,
              }, { degradations: progress.excerpts.length === 0 ? ["No se recuperaron fragmentos oficiales."] : [] });
            } else if (progress.type === "consensus.completed") {
              await write("consensus.completed", {
                analysisId,
                claimIndex: progress.claimIndex,
                consensus: progress.consensus,
                traceEventId: progress.traceEventId,
              });
            } else if (progress.type === "model.completed" || progress.type === "model.failed") {
              await write(progress.type, {
                analysisId,
                claimIndex: progress.claimIndex,
                proposal: progress.proposal,
                traceEventId: progress.traceEventId,
              }, { retries: progress.proposal.retries, degradations: progress.proposal.limitation ? [progress.proposal.limitation] : [] });
            }
          },
        };
        const result = await runAnalysis(options);
        const traceEventIds = result.traceEvents.map((event) => event.id);
        const terminalLimitations = [...new Set([...result.limitations, ...auditDegradations])];
        await write("analysis.completed", {
          analysisId,
          status: auditDegradations.length > 0 ? "partial" : result.status === "invalid" ? "failed" : result.status,
          claims: result.claims,
          limitations: terminalLimitations,
          traceEventIds,
        }, { degradations: terminalLimitations });
      } catch (error) {
        if (!controller.signal.aborted && !stream.aborted) {
          const message = error instanceof Error ? error.message : "El análisis no pudo completarse.";
          await write("model.failed", {
            analysisId,
            claimIndex: -1,
            proposal: {
              model: PROPOSAL_MODELS[0],
              provenance: { provider: "workers-ai", modelId: PROPOSAL_MODELS[0] },
              status: "failed",
              limitation: message,
              errorCode: "outage",
              retries: 0,
            },
            traceEventId: "",
          }, { degradations: [message] });
          await write("analysis.completed", {
            analysisId,
            status: "failed",
            claims: [],
            limitations: [message],
            traceEventIds: [],
          }, { degradations: [message] });
        }
      } finally {
        context.req.raw.signal.removeEventListener("abort", abort);
      }
    });
  });

  return routes;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("La auditoría agotó el tiempo disponible.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
