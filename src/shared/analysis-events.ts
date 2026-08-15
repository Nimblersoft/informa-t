// # Spec: docs/specs/sse-analysis.md

import type {
  AnalyzedClaim,
  ProposalAttempt,
  ProposalConsensus,
} from "../server/pipeline/analyze-text";
import type {
  EvidenceExcerpt,
  ExtractedClaim,
} from "./contracts";
import type { ModelProvenance } from "../server/providers/workers-ai";

export const ANALYSIS_PIPELINE_VERSION = "analysis-sse.v1" as const;
export const ANALYSIS_PROMPT_VERSION = "claim-extraction.v3" as const;

export const ANALYSIS_EVENT_NAMES = [
  "analysis.started",
  "claim.extracted",
  "evidence.retrieved",
  "model.completed",
  "model.failed",
  "consensus.completed",
  "analysis.completed",
] as const;

export type AnalysisEventName = (typeof ANALYSIS_EVENT_NAMES)[number];

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AnalysisEventMeta {
  pipelineVersion: typeof ANALYSIS_PIPELINE_VERSION;
  promptVersion: typeof ANALYSIS_PROMPT_VERSION;
  durationMs: number;
  usage: TokenUsage | null;
  retries: number;
  degradations: string[];
}

export interface AnalysisStartedData extends AnalysisEventMeta {
  analysisId: string;
  textLength: number;
  inputType?: "text" | "url";
  sourceUrl?: string;
}

export interface ClaimExtractedData extends AnalysisEventMeta {
  analysisId: string;
  claims: ExtractedClaim[];
  provenance: ModelProvenance;
  traceEventId: string;
}

export interface EvidenceRetrievedData extends AnalysisEventMeta {
  analysisId: string;
  claim: ExtractedClaim;
  excerpts: EvidenceExcerpt[];
  traceEventId?: string;
}

export interface ModelCompletedData extends AnalysisEventMeta {
  analysisId: string;
  claimIndex: number;
  proposal: ProposalAttempt;
  traceEventId: string;
}

export interface ModelFailedData extends AnalysisEventMeta {
  analysisId: string;
  claimIndex: number;
  proposal: ProposalAttempt;
  traceEventId: string;
}

export interface ConsensusCompletedData extends AnalysisEventMeta {
  analysisId: string;
  claimIndex: number;
  consensus: ProposalConsensus | null;
  traceEventId: string;
}

export interface AnalysisCompletedData extends AnalysisEventMeta {
  analysisId: string;
  status: "completed" | "partial" | "failed";
  claims: AnalyzedClaim[];
  limitations: string[];
  traceEventIds: string[];
}

export interface AnalysisEventMap {
  "analysis.started": AnalysisStartedData;
  "claim.extracted": ClaimExtractedData;
  "evidence.retrieved": EvidenceRetrievedData;
  "model.completed": ModelCompletedData;
  "model.failed": ModelFailedData;
  "consensus.completed": ConsensusCompletedData;
  "analysis.completed": AnalysisCompletedData;
}

export type AnalysisEvent = {
  [Name in AnalysisEventName]: {
    type: Name;
    id: string;
    data: AnalysisEventMap[Name];
  };
}[AnalysisEventName];
