// # Spec: docs/specs/model-fallback.md

import { describe, expect, it } from "vitest";

import { getOpenRouterModel, PIPELINE_TIMEOUT_MS, PROPOSAL_MODELS } from "../src/server/config/models";
import { analyzeText } from "../src/server/pipeline/analyze-text";
import { OpenRouterClient, type OpenRouterTransport } from "../src/server/providers/openrouter";
import type { WorkersAiBinding } from "../src/server/providers/workers-ai";
import type { ClaimExtractionV1, ProposalV1 } from "../src/shared/contracts";
import type { AiSearchProvider, AiSearchProviderResult } from "../src/server/providers/ai-search";

const text = "El INEC reportó que la pobreza por ingresos cambió durante junio de 2025.";

const claim: ClaimExtractionV1["claims"][number] = {
  verbatimText: "El INEC reportó que la pobreza por ingresos cambió durante junio de 2025.",
  normalizedText: "INEC reportó cambio de pobreza por ingresos en junio de 2025",
  location: { start: 0, end: 75 },
  entities: ["INEC"],
  dates: ["junio de 2025"],
  verifiable: true,
  electorallyRelevant: true,
  sourceAvailability: "no consultada",
  excluded: false,
};

const extraction: ClaimExtractionV1 = { schemaVersion: "claim-extraction.v1", claims: [claim] };

const proposal: ProposalV1 = {
  schemaVersion: "proposal.v1",
  reviewFocus: "Contrastar evidencia",
  supportingEvidenceIds: ["inec-1"],
  contraryEvidenceIds: [],
  rationale: "La propuesta identifica evidencia oficial para revisión humana.",
  uncertainty: "La cobertura depende del corpus consultado.",
  limitations: [],
  indices: { polarization: 10, emotionalLoad: 20, publicDataSupport: 80 },
};

const evidence: AiSearchProviderResult = {
  outcome: "Evidencia encontrada",
  excerpts: [{
    id: "inec-1", institution: "INEC", collection: "ENEMDU", title: "Boletín", version: "2025",
    sourceUrl: "https://example.test/inec", retrievalDate: "2026-08-15", citationLocation: "Tabla 1",
    license: "CC BY 4.0", coverageLimits: "Nacional", excerpt: "Texto oficial", sha256: "a".repeat(64),
  }],
  limitations: [],
  traceEvents: [],
};

function fakeSearch(): Pick<AiSearchProvider, "searchEvidence"> {
  return { searchEvidence: async () => evidence };
}

function openRouterResponse(value: unknown): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createTransport(status = 200, value: unknown = proposal): { transport: OpenRouterTransport; calls: Request[] } {
  const calls: Request[] = [];
  const transport: OpenRouterTransport = async (input, init) => {
    calls.push(new Request(input, init));
    return status === 200 ? openRouterResponse(value) : new Response("upstream unavailable", { status });
  };
  return { transport, calls };
}

class FakeAi implements WorkersAiBinding {
  constructor(private readonly failModels: ReadonlySet<string> = new Set(), private readonly failExtraction = false) {}

  async run(model: string, input: any): Promise<unknown> {
    if (input.response_format.json_schema === "claim-extraction.v1") {
      if (this.failExtraction) throw new Error("Workers AI service unavailable");
      return JSON.stringify(extraction);
    }
    if (this.failModels.has(model)) throw new Error("Workers AI service unavailable");
    return proposal;
  }
}

function createOpenRouter(transport: OpenRouterTransport): OpenRouterClient {
  return new OpenRouterClient({ env: { OPENROUTER_API_KEY: "test-openrouter-key" }, transport });
}

describe("OpenRouter model fallback", () => {
  it("retains the 90-second shared budget and no-verdict consensus guard", () => {
    expect(PIPELINE_TIMEOUT_MS).toBe(90_000);
  });

  it.each([
    ["error", new Error("Workers AI service unavailable")],
    ["quota", new Error("quota exhausted 429")],
    ["timeout", new DOMException("aborted", "AbortError")],
  ])("falls back after Workers AI %s and preserves structured provenance", async (_reason, failure) => {
    const failedModel = PROPOSAL_MODELS[0];
    const { transport, calls } = createTransport();
    const ai: WorkersAiBinding = {
      async run(model, input: any): Promise<unknown> {
        if (input.response_format.json_schema === "claim-extraction.v1") return JSON.stringify(extraction);
        if (model === failedModel) throw failure;
        return proposal;
      },
    };

    const result = await analyzeText({ text, ai, search: fakeSearch(), openRouter: createOpenRouter(transport) });
    const fallbackProposal = result.claims[0].proposals.find((item) => item.model === failedModel);

    expect(fallbackProposal?.status).toBe("valid");
    expect(fallbackProposal?.provenance).toEqual({ provider: "openrouter", modelId: getOpenRouterModel(failedModel) });
    expect(result.claims[0].provenance).toEqual({ provider: "workers-ai", modelId: "@cf/zai-org/glm-4.7-flash" });
    expect(JSON.parse(await calls[0].text()).model).toBe(getOpenRouterModel(failedModel));
    expect(result.traceEvents.some((event) => event.title === "Respaldo de proveedor" && event.details.includes("openrouter"))).toBe(true);
  });

  it("falls back for extraction and keeps the claim result non-editorial", async () => {
    const { transport } = createTransport(200, extraction);
    const result = await analyzeText({ text, ai: new FakeAi(new Set(), true), search: fakeSearch(), openRouter: createOpenRouter(transport) });

    expect(result.claims[0].provenance).toEqual({ provider: "openrouter", modelId: getOpenRouterModel("@cf/zai-org/glm-4.7-flash") });
    expect(result.claims[0].consensus?.reviewFocus).toBe("Contrastar evidencia");
    expect(result.traceEvents.some((event) => event.title === "Respaldo de proveedor")).toBe(true);
  });

  it("surfaces an honest failure when the fallback also fails", async () => {
    const { transport } = createTransport(503);
    const result = await analyzeText({
      text,
      ai: new FakeAi(new Set(PROPOSAL_MODELS)),
      search: fakeSearch(),
      openRouter: createOpenRouter(transport),
    });

    expect(result.claims[0].proposals.every((item) => item.status === "failed")).toBe(true);
    expect(result.claims[0].consensus).toBeNull();
    expect(result.limitations.join(" ")).toContain("respaldo OpenRouter también falló");
    expect(result.traceEvents.some((event) => event.title === "Respaldo de proveedor" && event.status === "Fallido")).toBe(true);
  });

  it("degrades to Workers AI only with a Spanish limitation when the key is absent", async () => {
    const { transport, calls } = createTransport();
    const result = await analyzeText({
      text,
      ai: new FakeAi(new Set(PROPOSAL_MODELS)),
      search: fakeSearch(),
      openRouter: new OpenRouterClient({ env: {}, transport }),
    });

    expect(calls).toHaveLength(0);
    expect(result.limitations.join(" ")).toContain("No hay una clave de OpenRouter configurada");
    expect(result.traceEvents.some((event) => event.title === "Respaldo de proveedor")).toBe(false);
    expect(result.claims[0].proposals.every((item) => item.provenance.provider === "workers-ai")).toBe(true);
  });

  it("redacts the auth header from transport-visible trace data and sends structured JSON", async () => {
    const { transport, calls } = createTransport();
    const result = await analyzeText({
      text,
      ai: new FakeAi(new Set([PROPOSAL_MODELS[0]])),
      search: fakeSearch(),
      openRouter: createOpenRouter(transport),
    });

    expect(calls[0].headers.get("authorization")).toBe("Bearer test-openrouter-key");
    expect(JSON.parse(await calls[0].text()).response_format).toEqual({ type: "json_object" });
    expect(result.traceEvents.every((event) => !event.details.includes("test-openrouter-key"))).toBe(true);
  });
});
