// Spec: docs/specs/model-fallback.md

export const CLAIM_EXTRACTION_MODEL = "@cf/zai-org/glm-4.7-flash" as const;

export const PROPOSAL_MODELS = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/nvidia/nemotron-3-120b-a12b",
] as const;

export type ProposalModel = (typeof PROPOSAL_MODELS)[number];

export type WorkersAiModel = typeof CLAIM_EXTRACTION_MODEL | ProposalModel;

export const OPENROUTER_MODEL_EQUIVALENTS: Record<WorkersAiModel, string> = {
  "@cf/zai-org/glm-4.7-flash": "z-ai/glm-4.5-air",
  "@cf/google/gemma-4-26b-a4b-it": "google/gemma-3-27b-it",
  "@cf/nvidia/nemotron-3-120b-a12b": "nvidia/nemotron-3-nano-30b-a3b",
};

export function getOpenRouterModel(model: WorkersAiModel): string {
  return OPENROUTER_MODEL_EQUIVALENTS[model];
}

export const PIPELINE_TIMEOUT_MS = 90_000;
