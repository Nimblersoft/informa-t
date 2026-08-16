// # Spec: docs/specs/text-analysis-engine.md

import { describe, expect, it } from "vitest";

import { isClaimExtractionV4, type ClaimExtractionV4, type ProposalV1 } from "../src/shared/contracts";
import { PROPOSAL_MODELS } from "../src/server/config/models";
import { analyzeText } from "../src/server/pipeline/analyze-text";
import { EXTRACTION_INPUT_MAX_CHARS } from "../src/server/prompts/text-analysis";
import type { AiSearchProviderResult } from "../src/server/providers/ai-search";
import type { WorkersAiBinding } from "../src/server/providers/workers-ai";

const text = "El INEC reportó que la pobreza por ingresos cambió durante junio de 2025.";

function claim(decision: ClaimExtractionV4["claims"][number]["decision"] = "lista_para_contraste"): ClaimExtractionV4["claims"][number] {
  return {
    verbatim: "El INEC reportó que la pobreza por ingresos cambió durante junio de 2025.",
    rationale: "El reporte oficial permite contrastar la afirmación.",
    decision,
  };
}

function extraction(count = 1): ClaimExtractionV4 {
  return { schemaVersion: "claim-extraction.v4", claims: Array.from({ length: count }, () => claim()) };
}

function proposal(reviewFocus: ProposalV1["reviewFocus"] = "Contrastar evidencia"): ProposalV1 {
  return {
    schemaVersion: "proposal.v1",
    reviewFocus,
    supportingEvidenceIds: ["inec-1"],
    contraryEvidenceIds: [],
    rationale: "La propuesta identifica evidencia oficial para que una persona editora la contraste.",
    uncertainty: "La cobertura depende del corpus consultado.",
    limitations: reviewFocus === "Revisar contexto" ? ["Falta precisar el período de comparación."] : [],
    indices: { polarization: 10, emotionalLoad: 20, publicDataSupport: 80 },
  };
}

function evidenceResult(): AiSearchProviderResult {
  return {
    outcome: "Evidencia encontrada",
    excerpts: [{
      id: "inec-1", institution: "INEC", collection: "ENEMDU", title: "Boletín", version: "2025", sourceUrl: "https://example.test/inec", retrievalDate: "2026-08-15", citationLocation: "Tabla 1", license: "CC BY 4.0", coverageLimits: "Nacional", excerpt: "Texto oficial", sha256: "a".repeat(64),
    }],
    limitations: [],
    traceEvents: [],
  };
}

function fakeSearch(): Pick<import("../src/server/providers/ai-search").AiSearchProvider, "searchEvidence"> {
  return { searchEvidence: async () => evidenceResult() };
}

class FakeAi implements WorkersAiBinding {
  readonly inputs: Array<{ model: string; input: unknown }> = [];
  constructor(private readonly respond: (model: string, input: any) => unknown | Promise<unknown>) {}
  async run(model: string, input: unknown): Promise<unknown> {
    this.inputs.push({ model, input });
    return this.respond(model, input);
  }
}

function isExtraction(input: { messages?: Array<{ role: string; content: string }> }): boolean {
  return (input.messages?.[0]?.content ?? "").includes("Extrae") || (input.messages?.[0]?.content ?? "").startsWith("La siguiente respuesta no cumple");
}

describe("text analysis engine", () => {
  it("requires the v4 decision and rejects model-supplied derived fields", () => {
    expect(isClaimExtractionV4({ schemaVersion: "claim-extraction.v4", claims: [{ ...claim(), decision: "opinión" }] })).toBe(true);
    expect(isClaimExtractionV4({ schemaVersion: "claim-extraction.v4", claims: [{ ...claim(), decision: "no permitido" }] })).toBe(false);
    expect(isClaimExtractionV4({
      schemaVersion: "claim-extraction.v4",
      claims: [{ ...claim(), normalizedText: "no permitido" }],
    })).toBe(false);
  });

  it("extracts one claim, retrieves evidence, and sends the same proposal payload to all three models", async () => {
    const ai = new FakeAi((_model, input) => isExtraction(input) ? JSON.stringify(extraction()) : JSON.stringify(proposal()));
    const result = await analyzeText({ text, ai, search: fakeSearch() });

    expect(result.status).toBe("completed");
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].proposals).toHaveLength(3);
    expect(result.claims[0].consensus).toEqual({ reviewFocus: "Contrastar evidencia", agreement: "3/3" });
    const proposalCalls = ai.inputs.filter(({ input }) => !isExtraction(input as never));
    expect(proposalCalls.map(({ model }) => model)).toEqual(PROPOSAL_MODELS);
    expect(proposalCalls.map(({ input }) => input)).toEqual([proposalCalls[0].input, proposalCalls[0].input, proposalCalls[0].input]);
  });

  it("processes up to three extracted claims", async () => {
    const ai = new FakeAi((_model, input) => isExtraction(input) ? extraction(3) : proposal());
    const result = await analyzeText({ text, ai, search: fakeSearch() });

    expect(result.claims).toHaveLength(3);
    expect(result.claims.every((item) => item.proposals.length === 3)).toBe(true);
  });

  it("bounds slow proposal attempts so all extracted claims finish within the pipeline budget", async () => {
    const ai = new FakeAi((_model, input) => isExtraction(input)
      ? extraction(2)
      : new Promise((resolve) => setTimeout(() => resolve(proposal()), 50)));
    const result = await analyzeText({ text, ai, search: fakeSearch(), proposalAttemptTimeoutMs: 1 });

    expect(result.status).toBe("partial");
    expect(result.claims).toHaveLength(2);
    expect(result.claims.flatMap((item) => item.proposals).every((item) => item.status === "failed" && item.errorCode === "timeout")).toBe(true);
  });

  it("derives normalized text and source location without requiring model fields", async () => {
    const sourceText = "Prefacio.  El INEC   reportó cambios verificables.";
    const extracted = { schemaVersion: "claim-extraction.v4" as const, claims: [{ verbatim: "El INEC   reportó cambios verificables.", rationale: "El reporte permite contraste.", decision: "lista_para_contraste" as const }] };
    const ai = new FakeAi((_model, input) => isExtraction(input) ? extracted : proposal());
    const result = await analyzeText({ text: sourceText, ai, search: fakeSearch() });

    expect(result.claims[0].claim.normalizedText).toBe("El INEC reportó cambios verificables.");
    expect(result.claims[0].claim.location).toEqual({ start: 11, end: 50 });
    expect(result.claims[0].claim.entities).toBeUndefined();
  });

  it("discards model paraphrases that are not grounded in the source", async () => {
    const extracted = { schemaVersion: "claim-extraction.v4" as const, claims: [{ verbatim: "El INEC informó una variación.", rationale: "El encuadre requiere contraste.", decision: "lista_para_contraste" as const }] };
    const ai = new FakeAi((_model, input) => isExtraction(input) ? extracted : proposal());
    const result = await analyzeText({ text, ai, search: fakeSearch() });

    expect(result.claims).toEqual([]);
    expect(result.limitations.join(" ")).toContain("no aparecen literalmente");
  });

  it("repairs exactly one invalid JSON response", async () => {
    let extractionCalls = 0;
    const ai = new FakeAi((_model, input) => {
      if (isExtraction(input)) {
        extractionCalls += 1;
        return extractionCalls === 1 ? "{not json" : extraction();
      }
      return proposal();
    });
    const result = await analyzeText({ text, ai, search: fakeSearch() });

    expect(result.status).toBe("completed");
    expect(extractionCalls).toBe(2);
  });

  it("truncates oversized extraction input and records a Spanish degradation", async () => {
    const ai = new FakeAi((_model, input) => isExtraction(input) ? extraction() : proposal());
    const oversizedText = "x".repeat(EXTRACTION_INPUT_MAX_CHARS + 1);
    const result = await analyzeText({ text: oversizedText, ai, search: fakeSearch() });
    const extractionInput = ai.inputs.find(({ input }) => isExtraction(input as never))?.input as { messages: Array<{ content: string }> };

    expect(extractionInput.messages[1].content).toHaveLength(EXTRACTION_INPUT_MAX_CHARS);
    expect(result.limitations).toContain("El artículo fue truncado para el análisis del prototipo.");
  });

  it("records a non-repairable invalid response without fabricating consensus", async () => {
    const ai = new FakeAi((_model, input) => isExtraction(input) ? extraction() : "not json");
    const result = await analyzeText({ text, ai, search: fakeSearch() });

    expect(result.status).toBe("partial");
    expect(result.claims[0].proposals.every((item) => item.status === "failed")).toBe(true);
    expect(result.claims[0].consensus).toBeNull();
    expect(result.limitations.some((item) => item.includes("único intento de reparación"))).toBe(true);
  });

  it("surfaces outage, quota, and timeout limitations as failed proposals", async () => {
    const failures = [new Error("service unavailable"), new Error("quota exhausted 429"), new DOMException("aborted", "AbortError")];
    let proposalCall = 0;
    const ai = new FakeAi((_model, input) => {
      if (isExtraction(input)) return extraction();
      throw failures[proposalCall++];
    });
    const result = await analyzeText({ text, ai, search: fakeSearch() });

    expect(result.claims[0].proposals.map((item) => item.status)).toEqual(["failed", "failed", "failed"]);
    expect(result.claims[0].consensus).toBeNull();
    expect(result.limitations.join(" ")).toContain("temporalmente");
    expect(result.limitations.join(" ")).toContain("límite de cuota");
    expect(result.limitations.join(" ")).toContain("tiempo disponible");
    expect(result.traceEvents.some((event) => event.details.includes("\"errorCode\":\"quota\""))).toBe(true);
  });

  it("returns a Spanish validation limitation for out-of-range text without invoking providers", async () => {
    const ai = new FakeAi(() => { throw new Error("must not run"); });
    const result = await analyzeText({ text: "corto", ai, search: fakeSearch() });

    expect(result.status).toBe("invalid");
    expect(result.limitations).toEqual(["El texto debe tener entre 20 y 20.000 caracteres para analizarlo."]);
    expect(ai.inputs).toEqual([]);
  });

  it("does not complete when every grounded claim is excluded", async () => {
    const excludedExtraction: ClaimExtractionV4 = {
      schemaVersion: "claim-extraction.v4",
      claims: [{ ...claim(), decision: "opinión" }],
    };
    const ai = new FakeAi((_model, input) => isExtraction(input) ? excludedExtraction : proposal());
    const result = await analyzeText({ text, ai, search: fakeSearch() });

    expect(result.status).toBe("partial");
    expect(result.claims[0].claim.excluded).toBe(true);
    expect(result.limitations.join(" ")).toContain("Todas las aseveraciones");
  });

  it("continues ambiguous claims through evidence and all three contextual proposals", async () => {
    let searches = 0;
    const ai = new FakeAi((_model, input) => isExtraction(input)
      ? extractionFromClaim({ ...claim(), verbatim: "La pobreza se ha reducido en un 20%", decision: "ambigüedad", rationale: "Falta período, geografía o base para contrastar." })
      : proposal("Revisar contexto"));
    const result = await analyzeText({
      text: "La pobreza se ha reducido en un 20%.",
      ai,
      search: { searchEvidence: async () => { searches += 1; return evidenceResult(); } },
    });

    expect(searches).toBe(1);
    expect(result.claims[0].claim).toMatchObject({ excluded: false, verifiable: false, extractionDecision: "ambigüedad", pipelineDisposition: "continuar_con_contexto" });
    expect(result.claims[0].evidence).toHaveLength(1);
    expect(result.claims[0].proposals).toHaveLength(3);
    expect(result.claims[0].proposals.every((item) => item.status === "valid" && item.proposal?.reviewFocus === "Revisar contexto" && (item.proposal.limitations.length ?? 0) > 0)).toBe(true);
    expect(result.limitations).toContain("La aseveración continúa con contexto: falta precisar período, geografía o base antes de un contraste directo.");
  });

  it("does not consult evidence for hard exclusions", async () => {
    let searches = 0;
    const ai = new FakeAi((_model, input) => isExtraction(input) ? extractionFromClaim({ ...claim(), decision: "opinión" }) : proposal());
    const result = await analyzeText({ text, ai, search: { searchEvidence: async () => { searches += 1; return evidenceResult(); } } });

    expect(searches).toBe(0);
    expect(result.claims[0].claim.excluded).toBe(true);
  });
});

function extractionFromClaim(claimValue: ClaimExtractionV4["claims"][number]): ClaimExtractionV4 {
  return { schemaVersion: "claim-extraction.v4", claims: [claimValue] };
}
