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
import { analyzeText, type AnalyzeTextOptions } from "../pipeline/analyze-text";
import { PROPOSAL_MODELS } from "../config/models";
import { createAiSearchProvider, type AiSearchNamespaceBinding, type AiSearchProvider } from "../providers/ai-search";
import { OpenRouterClient, type OpenRouterModelProvider } from "../providers/openrouter";
import type { WorkersAiBinding } from "../providers/workers-ai";

export interface AnalysisRouteEnv {
  AI: WorkersAiBinding;
  AI_SEARCH: AiSearchNamespaceBinding;
  OPENROUTER_API_KEY?: string;
}

export interface AnalysisRouteDependencies {
  ai: WorkersAiBinding;
  search: Pick<AiSearchProvider, "searchEvidence">;
  openRouter?: OpenRouterModelProvider;
  now?: () => number;
  analyze?: typeof analyzeText;
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

    const text = body && typeof body === "object" && "text" in body ? (body as { text?: unknown }).text : undefined;
    if (typeof text !== "string" || text.length < 20 || text.length > 20_000) {
      return context.json({ error: "El texto debe tener entre 20 y 20.000 caracteres para analizarlo." }, 400);
    }

    const env = context.env;
    const resolved: AnalysisRouteDependencies = dependencies ?? {
      ai: env.AI,
      search: createAiSearchProvider({ binding: env.AI_SEARCH }),
      openRouter: new OpenRouterClient({ env }),
    };
    const now = resolved.now ?? Date.now;
    const runAnalysis = resolved.analyze ?? analyzeText;
    const analysisId = `analysis-${crypto.randomUUID()}`;

    context.header("Content-Encoding", "identity");
    return streamSSE(context, async (stream) => {
      const controller = new AbortController();
      let startedAt = now();
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
        await write("analysis.started", { analysisId, textLength: text.length });
        startedAt = now();

        const options: AnalyzeTextOptions = {
          text,
          ai: resolved.ai,
          search: resolved.search,
          openRouter: resolved.openRouter,
          signal: controller.signal,
          now,
          onProgress: async (progress) => {
            if (progress.type === "claim.extracted") {
              await write("claim.extracted", {
                analysisId,
                claims: progress.claims,
                provenance: progress.provenance,
                traceEventId: progress.traceEventId,
              }, { retries: progress.retries });
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
        await write("analysis.completed", {
          analysisId,
          status: result.status === "invalid" ? "failed" : result.status,
          claims: result.claims,
          limitations: result.limitations,
          traceEventIds,
        }, { degradations: result.limitations });
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
