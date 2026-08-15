// Spec: docs/specs/text-analysis-engine.md

import {
  type EvidenceExcerpt,
  type ExtractedClaim,
} from "../../shared/contracts";

export const CLAIM_EXTRACTION_PROMPT_VERSION = "claim-extraction.v3" as const;
export const EXTRACTION_INPUT_MAX_CHARS = 8_000;
export const EXTRACTION_TRUNCATION_LIMITATION = "El artículo fue truncado para el análisis del prototipo.";

const CLAIM_SCHEMA_SPEC = `Devuelve EXACTAMENTE un objeto JSON con esta forma (sin campos adicionales, sin markdown):
{
  "schemaVersion": "claim-extraction.v3",
  "claims": [
    {
      "verbatim": "<fragmento literal exacto del texto original>",
      "rationale": "<encuadre supervisor breve>",
      "excluded": false,
      "exclusionReason": "opinión" | "predicción" | "retórica" | "ambigüedad"
    }
  ]
}
 Reglas: máximo 3 aseveraciones. "verbatim" debe ser una subcadena exacta, carácter por carácter, del texto original. "excluded" es true solo para opinión, predicción, retórica o ambigüedad, y entonces "exclusionReason" es obligatorio; en caso contrario omite "exclusionReason". No emitas veredictos editoriales ni afirmes verdad o falsedad. El rationale es solo un encuadre breve para supervisión; no expongas razonamiento interno ni cadena de pensamiento.`;

const PROPOSAL_SCHEMA_SPEC = `Devuelve EXACTAMENTE un objeto JSON con esta forma (sin campos adicionales, sin markdown):
{
  "schemaVersion": "proposal.v1",
  "reviewFocus": "Contrastar evidencia" | "Evidencia limitada" | "Revisar contexto",
  "supportingEvidenceIds": ["<id de evidencia que apoya el contraste>"],
  "contraryEvidenceIds": ["<id de evidencia contraria>"],
  "rationale": "<explicación factual breve de cómo la evidencia se relaciona con la aseveración>",
  "uncertainty": "<incertidumbre principal en términos de datos disponibles>",
  "limitations": ["<limitaciones aplicables>"],
  "indices": { "polarization": 0.0, "emotionalLoad": 0.0, "publicDataSupport": 0.0 }
}
Reglas: es una propuesta NO vinculante para revisión humana. Los tres índices son números entre 0 y 1. Usa solo IDs de evidencia presentes en la entrada. Nunca emitas veredictos editoriales ni afirmes verdad o falsedad.`;

export function createClaimExtractionInput(text: string): Record<string, unknown> {
  const extractionText = text.slice(0, EXTRACTION_INPUT_MAX_CHARS);
  return {
    messages: [
      {
        role: "system",
        content: `Extrae hasta tres aseveraciones atómicas verificables únicamente del texto fuente. No uses navegación, encabezados, pies de página, cookies, licencias, menús, plantillas ni páginas de error como aseveraciones. ${CLAIM_SCHEMA_SPEC}`,
      },
      { role: "user", content: extractionText },
    ],
    response_format: { type: "json_object" },
  };
}

export function createClaimRepairInput(invalidResponse: string): Record<string, unknown> {
  return {
    messages: [
       {
        role: "user",
        content: `La siguiente respuesta no cumple el esquema claim-extraction.v3. Reinténtala cumpliéndolo exactamente y conserva solo fragmentos literales del texto fuente. ${CLAIM_SCHEMA_SPEC}\n\nRespuesta inválida:\n${invalidResponse}`,
      },
    ],
    response_format: { type: "json_object" },
  };
}

export function createProposalInput(claim: ExtractedClaim, evidence: EvidenceExcerpt[]): Record<string, unknown> {
  return {
    messages: [
       {
        role: "system",
        content: `Produce una propuesta no vinculante para revisión humana. Si no hay evidencia oficial relevante, informa evidencia limitada y no inventes relación. ${PROPOSAL_SCHEMA_SPEC}`,
      },
      { role: "user", content: JSON.stringify({ claim, evidence }) },
    ],
    response_format: { type: "json_object" },
  };
}

export function createProposalRepairInput(invalidResponse: string): Record<string, unknown> {
  return {
    messages: [
      {
        role: "user",
        content: `La siguiente respuesta no cumple el esquema proposal.v1. Reinténtala cumpliéndolo exactamente. ${PROPOSAL_SCHEMA_SPEC}\n\nRespuesta inválida:\n${invalidResponse}`,
      },
    ],
    response_format: { type: "json_object" },
  };
}
