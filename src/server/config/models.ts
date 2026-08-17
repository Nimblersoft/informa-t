// Spec: docs/specs/model-fallback.md

export const CLAIM_EXTRACTION_MODEL = "@cf/zai-org/glm-4.7-flash" as const;
export const OPENROUTER_EXTRACTION_MODEL = "google/gemma-4-31b-it:free" as const;
/** Backwards-compatibility alias */
export const LUNA_EXTRACTION_MODEL = OPENROUTER_EXTRACTION_MODEL;
export const EXTRACTION_ATTEMPT_TIMEOUT_MS = 20_000;
export const EXTRACTION_TIMEOUT_MS = 45_000;
export const PROPOSAL_ATTEMPT_TIMEOUT_MS = 20_000;

export const PROPOSAL_MODELS = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/nvidia/nemotron-3-120b-a12b",
] as const;

export type ProposalModel = (typeof PROPOSAL_MODELS)[number];

export type WorkersAiModel = typeof CLAIM_EXTRACTION_MODEL | ProposalModel;

export const OPENROUTER_MODEL_EQUIVALENTS: Record<WorkersAiModel, string> = {
  "@cf/zai-org/glm-4.7-flash": "z-ai/glm-5.2:free",
  "@cf/google/gemma-4-26b-a4b-it": "google/gemma-4-31b-it:free",
  "@cf/nvidia/nemotron-3-120b-a12b": "nvidia/nemotron-3-nano-30b-a3b:free",
};

export function getOpenRouterModel(model: WorkersAiModel): string {
  return OPENROUTER_MODEL_EQUIVALENTS[model];
}

export const PIPELINE_TIMEOUT_MS = 90_000;
