// Spec: docs/specs/text-analysis-engine.md

export const CLAIM_EXTRACTION_MODEL = "@cf/zai-org/glm-4.7-flash" as const;

export const PROPOSAL_MODELS = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/nvidia/nemotron-3-120b-a12b",
] as const;

export type ProposalModel = (typeof PROPOSAL_MODELS)[number];

export const PIPELINE_TIMEOUT_MS = 90_000;
