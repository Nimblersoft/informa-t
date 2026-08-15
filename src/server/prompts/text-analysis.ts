// Spec: docs/specs/text-analysis-engine.md

import {
  CLAIM_EXTRACTION_SCHEMA_VERSION,
  PROPOSAL_SCHEMA_VERSION,
  type EvidenceExcerpt,
  type ExtractedClaim,
} from "../../shared/contracts";

export function createClaimExtractionInput(text: string): Record<string, unknown> {
  return {
    messages: [
      {
        role: "system",
        content:
          "Extrae hasta tres aseveraciones atómicas. No emitas veredictos editoriales. Incluye únicamente JSON compatible con claim-extraction.v1.",
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_schema", json_schema: CLAIM_EXTRACTION_SCHEMA_VERSION },
  };
}

export function createClaimRepairInput(invalidResponse: string): Record<string, unknown> {
  return {
    messages: [
      {
        role: "user",
        content: `Repara esta respuesta para que cumpla exactamente ${CLAIM_EXTRACTION_SCHEMA_VERSION}; devuelve solo JSON: ${invalidResponse}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: CLAIM_EXTRACTION_SCHEMA_VERSION },
  };
}

export function createProposalInput(claim: ExtractedClaim, evidence: EvidenceExcerpt[]): Record<string, unknown> {
  return {
    messages: [
      {
        role: "system",
        content:
          "Produce una propuesta no vinculante para revisión humana. No emitas veredictos editoriales ni afirmes verdad o falsedad. Incluye únicamente JSON compatible con proposal.v1.",
      },
      { role: "user", content: JSON.stringify({ claim, evidence }) },
    ],
    response_format: { type: "json_schema", json_schema: PROPOSAL_SCHEMA_VERSION },
  };
}

export function createProposalRepairInput(invalidResponse: string): Record<string, unknown> {
  return {
    messages: [
      {
        role: "user",
        content: `Repara esta respuesta para que cumpla exactamente ${PROPOSAL_SCHEMA_VERSION}; devuelve solo JSON: ${invalidResponse}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: PROPOSAL_SCHEMA_VERSION },
  };
}
