// Spec: docs/specs/model-fallback.md

import {
  isClaimExtractionV1,
  isProposalV1,
  type ClaimExtractionV1,
  type EvidenceExcerpt,
  type ExtractedClaim,
  type JsonValue,
  type ProposalV1,
  type ReviewFocus,
  type TraceEvent,
} from "../../shared/contracts";
import { hashCanonicalJson, redactTrace } from "../../shared/trace";
import { CLAIM_EXTRACTION_MODEL, getOpenRouterModel, PIPELINE_TIMEOUT_MS, PROPOSAL_MODELS, type ProposalModel } from "../config/models";
import { createClaimExtractionInput, createClaimRepairInput, createProposalInput, createProposalRepairInput } from "../prompts/text-analysis";
import type { AiSearchProvider } from "../providers/ai-search";
import { runJsonWithProviderFallback, type ModelProvenance, type WorkersAiBinding } from "../providers/workers-ai";
import type { OpenRouterModelProvider } from "../providers/openrouter";

export interface ProposalAttempt {
  model: ProposalModel;
  provenance: ModelProvenance;
  status: "valid" | "failed";
  proposal?: ProposalV1;
  limitation?: string;
  errorCode?: "timeout" | "quota" | "outage" | "invalid_response";
  fallback?: {
    attempted: boolean;
    reason: "timeout" | "quota" | "outage";
    outcome: "success" | "failed";
  };
  retries: number;
}

export interface ProposalConsensus {
  reviewFocus: ReviewFocus;
  agreement: "2/3" | "3/3";
}

export interface AnalyzedClaim {
  claim: ExtractedClaim;
  provenance: ModelProvenance;
  evidence: EvidenceExcerpt[];
  proposals: [ProposalAttempt, ProposalAttempt, ProposalAttempt];
  consensus: ProposalConsensus | null;
}

export interface TextAnalysisResult {
  schemaVersion: "text-analysis.v1";
  status: "completed" | "partial" | "invalid";
  claims: AnalyzedClaim[];
  limitations: string[];
  traceEvents: TraceEvent[];
  elapsedMs: number;
}

export interface AnalyzeTextOptions {
  text: string;
  ai: WorkersAiBinding;
  search: Pick<AiSearchProvider, "searchEvidence">;
  openRouter?: OpenRouterModelProvider;
  timeoutMs?: number;
  now?: () => number;
  signal?: AbortSignal;
  onProgress?: (progress: TextAnalysisProgress) => void | Promise<void>;
}

export type TextAnalysisProgress =
  | {
      type: "claim.extracted";
      claims: ExtractedClaim[];
      provenance: ModelProvenance;
      traceEventId: string;
      retries: number;
    }
  | {
      type: "evidence.retrieved";
      claim: ExtractedClaim;
      excerpts: EvidenceExcerpt[];
      traceEventId?: string;
    }
  | {
      type: "model.completed" | "model.failed";
      claimIndex: number;
      proposal: ProposalAttempt;
      traceEventId: string;
    }
  | {
      type: "consensus.completed";
      claimIndex: number;
      consensus: ProposalConsensus | null;
      traceEventId: string;
    };

export async function analyzeText(options: AnalyzeTextOptions): Promise<TextAnalysisResult> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const validationError = validateText(options.text);
  if (validationError) {
    return {
      schemaVersion: "text-analysis.v1",
      status: "invalid",
      claims: [],
      limitations: [validationError],
      traceEvents: [await createTrace("Análisis", "Validación de texto", validationError, "Entrada inválida", { length: options.text.length })],
      elapsedMs: now() - startedAt,
    };
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? PIPELINE_TIMEOUT_MS);
  const traceEvents: TraceEvent[] = [];
  const limitations: string[] = [];

  try {
    const extraction = await runModel<ClaimExtractionV1>(options, CLAIM_EXTRACTION_MODEL, {
      input: createClaimExtractionInput(options.text),
      repairInput: createClaimRepairInput,
      guard: isClaimExtractionV1,
      signal: controller.signal,
    });

    if (!extraction.value) {
      const limitation = extraction.error?.limitation ?? "No se pudieron extraer aseveraciones del texto.";
      limitations.push(limitation);
      traceEvents.push(await createTrace("Análisis", "Extracción de aseveraciones", limitation, "Fallido", {
        provider: extraction.provenance.provider,
        model: extraction.provenance.modelId,
        error: extraction.error?.code,
      }));
      if (extraction.fallback?.attempted) {
        traceEvents.push(await createTrace("Análisis", "Respaldo de proveedor", "El respaldo OpenRouter no produjo aseveraciones válidas.", "Fallido", {
          fromProvider: "workers-ai",
          toProvider: "openrouter",
          reason: extraction.fallback.reason,
          provider: extraction.provenance.provider,
          model: extraction.provenance.modelId,
        }));
      }
      return buildResult("partial", [], limitations, traceEvents, now() - startedAt);
    }

      const extractionTrace = await createTrace("Análisis", "Extracción de aseveraciones", "Se extrajeron aseveraciones para revisión editorial.", "Completado", {
        provider: extraction.provenance.provider,
        model: extraction.provenance.modelId,
        claims: extraction.value.claims.length,
        repaired: extraction.repaired,
      });
      traceEvents.push(extractionTrace);
      await options.onProgress?.({
        type: "claim.extracted",
        claims: extraction.value.claims,
        provenance: extraction.provenance,
        traceEventId: extractionTrace.id,
        retries: extraction.repaired ? 1 : 0,
      });
    if (extraction.fallback?.attempted) {
      traceEvents.push(await createTrace("Análisis", "Respaldo de proveedor", extraction.fallback.outcome === "success" ? "Se utilizó OpenRouter como respaldo para extraer aseveraciones." : "El respaldo OpenRouter no produjo aseveraciones válidas.", extraction.fallback.outcome === "success" ? "Completado" : "Fallido", {
        fromProvider: "workers-ai",
        toProvider: "openrouter",
        reason: extraction.fallback.reason,
        provider: extraction.provenance.provider,
        model: extraction.provenance.modelId,
      }));
    }
    const analyzedClaims = await Promise.all(extraction.value.claims.map((claim, claimIndex) => analyzeClaim(claim, extraction.provenance, options, controller.signal, claimIndex)));
    for (const item of analyzedClaims) {
      traceEvents.push(...item.traceEvents);
      limitations.push(...item.limitations);
    }
    return buildResult(limitations.length > 0 ? "partial" : "completed", analyzedClaims.map(({ analyzed }) => analyzed), limitations, traceEvents, now() - startedAt);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

async function analyzeClaim(claim: ExtractedClaim, extractionProvenance: ModelProvenance, options: AnalyzeTextOptions, signal: AbortSignal, claimIndex: number): Promise<{ analyzed: AnalyzedClaim; limitations: string[]; traceEvents: TraceEvent[] }> {
  const traceEvents: TraceEvent[] = [];
  const limitations: string[] = [];
  if (claim.excluded) {
    return {
      analyzed: {
        claim,
        provenance: extractionProvenance,
        evidence: [],
        proposals: PROPOSAL_MODELS.map((model) => ({
          model,
          provenance: { provider: "workers-ai", modelId: model },
          status: "failed",
          limitation: "La aseveración fue excluida de la propuesta.",
          retries: 0,
        })) as AnalyzedClaim["proposals"],
        consensus: null,
      },
      limitations,
      traceEvents,
    };
  }

  const evidenceResult = await options.search.searchEvidence({ query: claim.normalizedText });
  const updatedClaim: ExtractedClaim = { ...claim, sourceAvailability: evidenceResult.outcome === "Evidencia encontrada" ? "disponible" : "insuficiente" };
  traceEvents.push(...evidenceResult.traceEvents);
  limitations.push(...evidenceResult.limitations);
  await options.onProgress?.({
    type: "evidence.retrieved",
    claim: updatedClaim,
    excerpts: evidenceResult.excerpts,
    traceEventId: evidenceResult.traceEvents[0]?.id,
  });

  const input = createProposalInput(updatedClaim, evidenceResult.excerpts);
  const settled = await Promise.allSettled(PROPOSAL_MODELS.map((model) => runProposal(model, input, options, signal)));
  const proposals = settled.map((result, index) => result.status === "fulfilled" ? result.value : ({
    model: PROPOSAL_MODELS[index],
    provenance: { provider: "workers-ai", modelId: PROPOSAL_MODELS[index] },
    status: "failed",
    limitation: "El modelo no está disponible temporalmente. No se generó una propuesta.",
    retries: 0,
  })) as AnalyzedClaim["proposals"];

  for (const proposal of proposals) {
    if (proposal.status === "failed" && proposal.limitation) {
      limitations.push(proposal.limitation);
    }
    const proposalTrace = await createTrace("Análisis", "Propuesta de modelo", proposal.status === "valid" ? "Propuesta no vinculante disponible para revisión humana." : proposal.limitation ?? "Propuesta no disponible.", proposal.status === "valid" ? "Completado" : "Fallido", {
      model: proposal.model,
      provider: proposal.provenance.provider,
      modelId: proposal.provenance.modelId,
      status: proposal.status,
      ...(proposal.proposal ? { proposal: proposal.proposal } : {}),
      ...(proposal.errorCode ? { errorCode: proposal.errorCode } : {}),
    });
    traceEvents.push(proposalTrace);
    await options.onProgress?.({
      type: proposal.status === "valid" ? "model.completed" : "model.failed",
      claimIndex,
      proposal,
      traceEventId: proposalTrace.id,
    });
    if (proposal.fallback?.attempted) {
      traceEvents.push(await createTrace(
        "Análisis",
        "Respaldo de proveedor",
        proposal.fallback.outcome === "success"
          ? "Se utilizó OpenRouter como respaldo para esta propuesta."
          : "El respaldo OpenRouter no produjo una propuesta válida.",
        proposal.fallback.outcome === "success" ? "Completado" : "Fallido",
        {
          fromProvider: "workers-ai",
          toProvider: "openrouter",
          reason: proposal.fallback.reason,
          provider: proposal.provenance.provider,
          model: proposal.provenance.modelId,
        },
      ));
    }
  }

  const consensus = getProposalConsensus(proposals);
  const consensusTrace = await createTrace("Consenso", "Síntesis de propuestas", consensus ? "La síntesis compara propuestas no vinculantes; no es una decisión editorial." : "No hay suficientes propuestas válidas para una síntesis.", consensus ? "Completado" : "Sin consenso", { validProposals: proposals.filter((proposal) => proposal.status === "valid").length, consensus });
  traceEvents.push(consensusTrace);
  await options.onProgress?.({ type: "consensus.completed", claimIndex, consensus, traceEventId: consensusTrace.id });
  return { analyzed: { claim: updatedClaim, provenance: extractionProvenance, evidence: evidenceResult.excerpts, proposals, consensus }, limitations, traceEvents };
}

async function runProposal(model: ProposalModel, input: Record<string, unknown>, options: AnalyzeTextOptions, signal: AbortSignal): Promise<ProposalAttempt> {
  const result = await runModel<ProposalV1>(options, model, {
    input,
    repairInput: createProposalRepairInput,
    guard: isProposalV1,
    signal,
  });
  return result.value
    ? { model, provenance: result.provenance, status: "valid", proposal: result.value, fallback: result.fallback, retries: result.repaired ? 1 : 0 }
    : {
        model,
        provenance: result.provenance,
        status: "failed",
        limitation: result.error?.limitation ?? "No se generó una propuesta.",
        errorCode: result.error?.code,
        fallback: result.fallback,
        retries: result.repaired ? 1 : 0,
      };
}

async function runModel<T>(options: AnalyzeTextOptions, model: typeof CLAIM_EXTRACTION_MODEL | ProposalModel, request: {
  input: Record<string, unknown>;
  repairInput: (invalidResponse: string) => Record<string, unknown>;
  guard: (value: unknown) => value is T;
  signal: AbortSignal;
}) {
  return runJsonWithProviderFallback<T>({
    primary: options.ai,
    primaryModel: model,
    fallback: options.openRouter && options.openRouter.isConfigured !== false ? { ai: options.openRouter, model: getOpenRouterModel(model) } : undefined,
    input: request.input,
    repairInput: request.repairInput,
    guard: request.guard,
    signal: request.signal,
    fallbackUnavailableLimitation: "No hay una clave de OpenRouter configurada; el análisis continúa solo con Workers AI.",
  });
}

function getProposalConsensus(proposals: readonly ProposalAttempt[]): ProposalConsensus | null {
  const valid = proposals.filter((proposal): proposal is ProposalAttempt & { proposal: ProposalV1 } => proposal.status === "valid" && proposal.proposal !== undefined);
  if (valid.length < 2) return null;
  const counts = new Map<ReviewFocus, number>();
  for (const proposal of valid) counts.set(proposal.proposal.reviewFocus, (counts.get(proposal.proposal.reviewFocus) ?? 0) + 1);
  for (const [reviewFocus, count] of counts) {
    if (count >= 2) return { reviewFocus, agreement: count === 3 ? "3/3" : "2/3" };
  }
  return null;
}

function validateText(text: string): string | null {
  if (text.length < 20 || text.length > 20_000) return "El texto debe tener entre 20 y 20.000 caracteres para analizarlo.";
  return null;
}

async function createTrace(stage: TraceEvent["stage"], title: string, description: string, status: string, details: Record<string, unknown>): Promise<TraceEvent> {
  const serializableDetails = JSON.parse(JSON.stringify(details)) as JsonValue;
  const redacted = redactTrace(serializableDetails);
  return { id: `trace-analysis-${crypto.randomUUID()}`, stage, timestamp: new Date().toISOString(), title, description, status, canonicalHash: await hashCanonicalJson(redacted), details: JSON.stringify(redacted) };
}

function buildResult(status: TextAnalysisResult["status"], claims: AnalyzedClaim[], limitations: string[], traceEvents: TraceEvent[], elapsedMs: number): TextAnalysisResult {
  return { schemaVersion: "text-analysis.v1", status, claims, limitations: [...new Set(limitations)], traceEvents, elapsedMs };
}
