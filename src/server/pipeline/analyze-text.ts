// Spec: docs/specs/model-fallback.md

import {
  isClaimExtractionV4,
  isProposalV1,
  type ClaimExtractionV4,
  type ClaimExtractionV4Claim,
  type ClaimExclusionReason,
  type EvidenceExcerpt,
  type ExtractedClaim,
  type JsonValue,
  type ProposalV1,
  type ReviewFocus,
  type TraceEvent,
} from "../../shared/contracts";
import { ANALYSIS_PROMPT_VERSION } from "../../shared/analysis-events";
import { hashCanonicalJson, redactTrace } from "../../shared/trace";
import { CLAIM_EXTRACTION_MODEL, EXTRACTION_ATTEMPT_TIMEOUT_MS, EXTRACTION_TIMEOUT_MS, getOpenRouterModel, LUNA_EXTRACTION_MODEL, PIPELINE_TIMEOUT_MS, PROPOSAL_ATTEMPT_TIMEOUT_MS, PROPOSAL_MODELS, type ProposalModel } from "../config/models";
import { createClaimExtractionInput, createClaimRepairInput, createProposalInput, createProposalRepairInput, EXTRACTION_INPUT_MAX_CHARS, EXTRACTION_TRUNCATION_LIMITATION } from "../prompts/text-analysis";
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
    reason: "timeout" | "quota" | "outage" | "invalid_response";
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
  proposalAttemptTimeoutMs?: number;
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
      traceEvent: TraceEvent;
      retries: number;
      degradations?: string[];
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
  const extractionDegradations = options.text.length > EXTRACTION_INPUT_MAX_CHARS ? [EXTRACTION_TRUNCATION_LIMITATION] : [];
  limitations.push(...extractionDegradations);

  try {
    const extraction = await runExtractionStage(options, controller.signal);

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
          fromProvider: extraction.fallback.fromProvider,
          toProvider: extraction.fallback.toProvider,
          fromModel: extraction.fallback.fromModel,
          toModel: extraction.fallback.toModel,
          reason: extraction.fallback.reason,
          provider: extraction.provenance.provider,
          model: extraction.provenance.modelId,
        }));
      }
      return buildResult("partial", [], limitations, traceEvents, now() - startedAt);
    }

    const candidateClaims = extraction.value.claims.slice(0, 3);
    const extractedClaims = candidateClaims
      .map((claim) => deriveExtractedClaim(claim, options.text))
      .filter((claim): claim is ExtractedClaim => claim !== undefined);
    if (extraction.value.claims.length > 0 && extractedClaims.length === 0) {
      limitations.push("Se descartaron las aseveraciones que no aparecen literalmente en el texto fuente recuperado.");
    } else if (candidateClaims.length > extractedClaims.length) {
      limitations.push("Se descartaron aseveraciones que no aparecen literalmente en el texto fuente recuperado.");
    }
    if (extractedClaims.length === 0) {
      limitations.push("No se recuperó ninguna aseveración utilizable para revisión editorial.");
    } else if (extractedClaims.every((claim) => claim.excluded)) {
      limitations.push("Todas las aseveraciones recuperadas fueron excluidas de propuestas; la revisión queda incompleta.");
    }
    for (const claim of extractedClaims) {
      if (claim.extractionDecision === "ambigüedad") {
        limitations.push("La aseveración continúa con contexto: falta precisar período, geografía o base antes de un contraste directo.");
      }
    }
    if (extraction.value.claims.length > candidateClaims.length) {
      const limitation = "El modelo propuso más de 3 aseveraciones; se conservaron solo las primeras 3 como límite del prototipo.";
      extractionDegradations.push(limitation);
      limitations.push(limitation);
    }
    if (extraction.fallback?.attempted && extraction.fallback.outcome === "success") {
      const fallbackLimitation = "La extracción supervisora Luna no estuvo disponible; se utilizó Workers AI como respaldo.";
      extractionDegradations.push(fallbackLimitation);
      limitations.push(fallbackLimitation);
    }

    const extractionTrace = await createTrace("Análisis", "Extracción de aseveraciones", "Se extrajeron aseveraciones para revisión editorial.", "Completado", {
      provider: extraction.provenance.provider,
      model: extraction.provenance.modelId,
      claims: extractedClaims.map((claim, claimIndex) => ({
        claimIndex,
        verbatimText: claim.verbatimText,
        extractorDecision: claim.extractionDecision,
        pipelineDisposition: claim.pipelineDisposition,
        rationale: claim.rationale ?? "",
      })),
      modelClaims: extraction.value.claims.length,
      promptVersion: ANALYSIS_PROMPT_VERSION,
      repaired: extraction.repaired,
    });
    traceEvents.push(extractionTrace);
    await options.onProgress?.({
      type: "claim.extracted",
      claims: extractedClaims,
      provenance: extraction.provenance,
      traceEventId: extractionTrace.id,
      traceEvent: extractionTrace,
      retries: extraction.repaired ? 1 : 0,
      degradations: extractionDegradations,
    });
    if (extraction.fallback?.attempted) {
      traceEvents.push(await createTrace("Análisis", "Respaldo de proveedor", extraction.fallback.outcome === "success" ? "Se utilizó un proveedor de respaldo para extraer aseveraciones." : "El proveedor de respaldo no produjo aseveraciones válidas.", extraction.fallback.outcome === "success" ? "Completado" : "Fallido", {
        fromProvider: extraction.fallback.fromProvider,
        toProvider: extraction.fallback.toProvider,
        fromModel: extraction.fallback.fromModel,
        toModel: extraction.fallback.toModel,
        reason: extraction.fallback.reason,
        provider: extraction.provenance.provider,
        model: extraction.provenance.modelId,
      }));
    }
    const analyzedClaims = await Promise.all(extractedClaims.map((claim, claimIndex) => analyzeClaim(claim, extraction.provenance, options, controller.signal, claimIndex)));
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
  const hasRelevantEvidence = evidenceResult.outcome === "Evidencia encontrada" && evidenceResult.excerpts.length > 0;
  const updatedClaim: ExtractedClaim = { ...claim, sourceAvailability: hasRelevantEvidence ? "disponible" : "insuficiente" };
  traceEvents.push(...evidenceResult.traceEvents);
  limitations.push(...evidenceResult.limitations);
  if (!hasRelevantEvidence) {
    limitations.push("No se recuperó evidencia oficial relevante para esta aseveración; la revisión queda incompleta.");
  }
  await options.onProgress?.({
    type: "evidence.retrieved",
    claim: updatedClaim,
    excerpts: evidenceResult.excerpts,
    traceEventId: evidenceResult.traceEvents[0]?.id,
  });

  if (!hasRelevantEvidence) {
    const proposals = PROPOSAL_MODELS.map((model) => ({
      model,
      provenance: { provider: "workers-ai", modelId: model },
      status: "failed" as const,
      limitation: "No se generó una propuesta porque no se recuperó evidencia oficial relevante.",
      retries: 0,
    })) as AnalyzedClaim["proposals"];
    for (const proposal of proposals) {
      const proposalTrace = await createTrace("Análisis", "Propuesta de modelo", "No se generó una propuesta porque no se recuperó evidencia oficial relevante.", "Fallido", {
        model: proposal.model,
        provider: proposal.provenance.provider,
        modelId: proposal.provenance.modelId,
        status: proposal.status,
      });
      traceEvents.push(proposalTrace);
      await options.onProgress?.({ type: "model.failed", claimIndex, proposal, traceEventId: proposalTrace.id });
    }
    return { analyzed: { claim: updatedClaim, provenance: extractionProvenance, evidence: [], proposals, consensus: null }, limitations, traceEvents };
  }

  const input = createProposalInput(updatedClaim, evidenceResult.excerpts);
  const settled = await Promise.allSettled(PROPOSAL_MODELS.map((model) => runProposal(model, input, options, signal, claim.extractionDecision === "ambigüedad")));
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

async function runProposal(model: ProposalModel, input: Record<string, unknown>, options: AnalyzeTextOptions, signal: AbortSignal, requiresContextReview = false): Promise<ProposalAttempt> {
  const result = await runModel<ProposalV1>(options, model, {
    input,
    repairInput: (invalidResponse) => createProposalRepairInput(invalidResponse, requiresContextReview),
    guard: (value): value is ProposalV1 => isProposalV1(value) && (!requiresContextReview || isContextualProposal(value)),
    signal,
    timeoutMs: options.proposalAttemptTimeoutMs ?? PROPOSAL_ATTEMPT_TIMEOUT_MS,
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

async function runExtractionStage(options: AnalyzeTextOptions, signal: AbortSignal) {
  const stageController = new AbortController();
  const abortStage = () => stageController.abort();
  signal.addEventListener("abort", abortStage, { once: true });
  const stageTimeout = setTimeout(abortStage, EXTRACTION_TIMEOUT_MS);

  try {
    let lastResult: Awaited<ReturnType<typeof runExtractionModel>> | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (stageController.signal.aborted) break;
      lastResult = await runExtractionModel(options, stageController.signal, EXTRACTION_ATTEMPT_TIMEOUT_MS);
      if (lastResult.value || stageController.signal.aborted || lastResult.error?.code !== "timeout" || attempt === 1) return lastResult;
    }
    return lastResult ?? await runExtractionModel(options, stageController.signal, EXTRACTION_ATTEMPT_TIMEOUT_MS);
  } finally {
    clearTimeout(stageTimeout);
    signal.removeEventListener("abort", abortStage);
  }
}

async function runExtractionModel(options: AnalyzeTextOptions, signal: AbortSignal, timeoutMs: number) {
  const input = createClaimExtractionInput(options.text);
  if (!options.openRouter || options.openRouter.isConfigured === false) {
    return runJsonWithProviderFallback<ClaimExtractionV4>({
      primary: options.ai,
      primaryModel: CLAIM_EXTRACTION_MODEL,
      input,
      repairInput: createClaimRepairInput,
      guard: (value): value is ClaimExtractionV4 => isClaimExtractionV4(value),
      signal,
      fallbackUnavailableLimitation: "No hay una clave de OpenRouter configurada; el análisis continúa solo con Workers AI.",
      timeoutMs,
    });
  }

  return runJsonWithProviderFallback<ClaimExtractionV4>({
    primary: options.openRouter,
    primaryModel: LUNA_EXTRACTION_MODEL,
    primaryProvider: "openrouter",
    fallback: { ai: options.ai, model: CLAIM_EXTRACTION_MODEL },
    fallbackProvider: "workers-ai",
    fallbackOnInvalidResponse: true,
    input,
    repairInput: createClaimRepairInput,
    guard: (value): value is ClaimExtractionV4 => isClaimExtractionV4(value),
    signal,
    fallbackUnavailableLimitation: "No hay una clave de OpenRouter configurada; el análisis continúa solo con Workers AI.",
    fallbackLabel: "Workers AI",
    timeoutMs,
  });
}

function deriveExtractedClaim(claim: ClaimExtractionV4Claim, sourceText: string): ExtractedClaim | undefined {
  const start = sourceText.indexOf(claim.verbatim);
  if (start < 0) return undefined;
  const excluded = claim.decision === "opinión" || claim.decision === "predicción" || claim.decision === "retórica";
  const pipelineDisposition = excluded ? "excluir" : claim.decision === "ambigüedad" ? "continuar_con_contexto" : "continuar";
  const exclusionReason: ClaimExclusionReason | undefined = excluded ? claim.decision as ClaimExclusionReason : undefined;
  return {
    verbatimText: claim.verbatim,
    normalizedText: claim.verbatim.trim().replace(/\s+/g, " "),
    location: { start, end: start + claim.verbatim.length },
    dates: [],
    verifiable: claim.decision === "lista_para_contraste",
    electorallyRelevant: true,
    sourceAvailability: "no consultada",
    excluded,
    extractionDecision: claim.decision,
    pipelineDisposition,
    ...(exclusionReason ? { exclusionReason } : {}),
    rationale: claim.rationale,
  };
}

function isContextualProposal(value: ProposalV1): boolean {
  return value.reviewFocus === "Revisar contexto" && value.uncertainty.trim().length > 0 && value.limitations.length > 0;
}

async function runModel<T>(options: AnalyzeTextOptions, model: typeof CLAIM_EXTRACTION_MODEL | ProposalModel, request: {
  input: Record<string, unknown>;
  repairInput: (invalidResponse: string) => Record<string, unknown>;
  guard: (value: unknown) => value is T;
  signal: AbortSignal;
  timeoutMs?: number;
}) {
  return runJsonWithProviderFallback<T>({
    primary: options.ai,
    primaryModel: model,
    fallback: options.openRouter && options.openRouter.isConfigured !== false ? { ai: options.openRouter, model: getOpenRouterModel(model) } : undefined,
    input: request.input,
    repairInput: request.repairInput,
    guard: request.guard,
    signal: request.signal,
    timeoutMs: request.timeoutMs,
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
