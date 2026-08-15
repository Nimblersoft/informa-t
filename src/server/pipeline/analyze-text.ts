// Spec: docs/specs/text-analysis-engine.md

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
import { CLAIM_EXTRACTION_MODEL, PIPELINE_TIMEOUT_MS, PROPOSAL_MODELS, type ProposalModel } from "../config/models";
import { createClaimExtractionInput, createClaimRepairInput, createProposalInput, createProposalRepairInput } from "../prompts/text-analysis";
import type { AiSearchProvider } from "../providers/ai-search";
import { runJsonWithSingleRepair, type WorkersAiBinding } from "../providers/workers-ai";

export interface ProposalAttempt {
  model: ProposalModel;
  status: "valid" | "failed";
  proposal?: ProposalV1;
  limitation?: string;
  errorCode?: "timeout" | "quota" | "outage" | "invalid_response";
}

export interface ProposalConsensus {
  reviewFocus: ReviewFocus;
  agreement: "2/3" | "3/3";
}

export interface AnalyzedClaim {
  claim: ExtractedClaim;
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
  timeoutMs?: number;
  now?: () => number;
}

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
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? PIPELINE_TIMEOUT_MS);
  const traceEvents: TraceEvent[] = [];
  const limitations: string[] = [];

  try {
    const extraction = await runJsonWithSingleRepair<ClaimExtractionV1>({
      ai: options.ai,
      model: CLAIM_EXTRACTION_MODEL,
      input: createClaimExtractionInput(options.text),
      repairInput: createClaimRepairInput,
      guard: isClaimExtractionV1,
      signal: controller.signal,
    });

    if (!extraction.value) {
      const limitation = extraction.error?.limitation ?? "No se pudieron extraer aseveraciones del texto.";
      limitations.push(limitation);
      traceEvents.push(await createTrace("Análisis", "Extracción de aseveraciones", limitation, "Fallido", { model: CLAIM_EXTRACTION_MODEL, error: extraction.error?.code }));
      return buildResult("partial", [], limitations, traceEvents, now() - startedAt);
    }

    traceEvents.push(await createTrace("Análisis", "Extracción de aseveraciones", "Se extrajeron aseveraciones para revisión editorial.", "Completado", { model: CLAIM_EXTRACTION_MODEL, claims: extraction.value.claims.length, repaired: extraction.repaired }));
    const analyzedClaims = await Promise.all(extraction.value.claims.map((claim) => analyzeClaim(claim, options, controller.signal)));
    for (const item of analyzedClaims) {
      traceEvents.push(...item.traceEvents);
      limitations.push(...item.limitations);
    }
    return buildResult(limitations.length > 0 ? "partial" : "completed", analyzedClaims.map(({ analyzed }) => analyzed), limitations, traceEvents, now() - startedAt);
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeClaim(claim: ExtractedClaim, options: AnalyzeTextOptions, signal: AbortSignal): Promise<{ analyzed: AnalyzedClaim; limitations: string[]; traceEvents: TraceEvent[] }> {
  const traceEvents: TraceEvent[] = [];
  const limitations: string[] = [];
  if (claim.excluded) {
    return {
      analyzed: { claim, evidence: [], proposals: PROPOSAL_MODELS.map((model) => ({ model, status: "failed", limitation: "La aseveración fue excluida de la propuesta." })) as AnalyzedClaim["proposals"], consensus: null },
      limitations,
      traceEvents,
    };
  }

  const evidenceResult = await options.search.searchEvidence({ query: claim.normalizedText });
  const updatedClaim: ExtractedClaim = { ...claim, sourceAvailability: evidenceResult.outcome === "Evidencia encontrada" ? "disponible" : "insuficiente" };
  traceEvents.push(...evidenceResult.traceEvents);
  limitations.push(...evidenceResult.limitations);

  const input = createProposalInput(updatedClaim, evidenceResult.excerpts);
  const settled = await Promise.allSettled(PROPOSAL_MODELS.map((model) => runProposal(model, input, options.ai, signal)));
  const proposals = settled.map((result, index) => result.status === "fulfilled" ? result.value : ({ model: PROPOSAL_MODELS[index], status: "failed", limitation: "El modelo no está disponible temporalmente. No se generó una propuesta." })) as AnalyzedClaim["proposals"];

  for (const proposal of proposals) {
    if (proposal.status === "failed" && proposal.limitation) {
      limitations.push(proposal.limitation);
    }
    traceEvents.push(await createTrace("Análisis", "Propuesta de modelo", proposal.status === "valid" ? "Propuesta no vinculante disponible para revisión humana." : proposal.limitation ?? "Propuesta no disponible.", proposal.status === "valid" ? "Completado" : "Fallido", {
      model: proposal.model,
      status: proposal.status,
      ...(proposal.proposal ? { proposal: proposal.proposal } : {}),
      ...(proposal.errorCode ? { errorCode: proposal.errorCode } : {}),
    }));
  }

  const consensus = getProposalConsensus(proposals);
  traceEvents.push(await createTrace("Consenso", "Síntesis de propuestas", consensus ? "La síntesis compara propuestas no vinculantes; no es una decisión editorial." : "No hay suficientes propuestas válidas para una síntesis.", consensus ? "Completado" : "Sin consenso", { validProposals: proposals.filter((proposal) => proposal.status === "valid").length, consensus }));
  return { analyzed: { claim: updatedClaim, evidence: evidenceResult.excerpts, proposals, consensus }, limitations, traceEvents };
}

async function runProposal(model: ProposalModel, input: Record<string, unknown>, ai: WorkersAiBinding, signal: AbortSignal): Promise<ProposalAttempt> {
  const result = await runJsonWithSingleRepair<ProposalV1>({
    ai,
    model,
    input,
    repairInput: createProposalRepairInput,
    guard: isProposalV1,
    signal,
  });
  return result.value
    ? { model, status: "valid", proposal: result.value }
    : {
        model,
        status: "failed",
        limitation: result.error?.limitation ?? "No se generó una propuesta.",
        errorCode: result.error?.code,
      };
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
