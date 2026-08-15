import { afterEach, describe, expect, it, vi } from "vitest";

import { extractReadableText, fetchArticleText, isPrivateIp } from "../src/server/article-fetch";
import { EXTRACTION_TIMEOUT_MS, LUNA_EXTRACTION_MODEL, PROPOSAL_MODELS } from "../src/server/config/models";
import { analyzeText } from "../src/server/pipeline/analyze-text";
import type { AiSearchProvider } from "../src/server/providers/ai-search";
import type { OpenRouterModelProvider } from "../src/server/providers/openrouter";
import type { WorkersAiBinding } from "../src/server/providers/workers-ai";
import { isClaimExtractionV2, parseAnalysisInput, type ClaimExtractionV2, type ProposalV1 } from "../src/shared/contracts";

const text = "La autoridad electoral publicó un informe verificable durante junio de 2025.";

function claim(index = 0, rationale = "El informe oficial permitiría contrastar esta afirmación.") {
  return {
    verbatimText: text,
    normalizedText: "La autoridad electoral publicó un informe",
    location: { start: index, end: index + text.length },
    entities: ["autoridad electoral"],
    dates: ["junio de 2025"],
    verifiable: true,
    electorallyRelevant: true,
    sourceAvailability: "no consultada" as const,
    excluded: false,
    rationale,
  };
}

const extraction: ClaimExtractionV2 = { schemaVersion: "claim-extraction.v2", claims: [claim()] };
const proposal: ProposalV1 = {
  schemaVersion: "proposal.v1",
  reviewFocus: "Contrastar evidencia",
  supportingEvidenceIds: [],
  contraryEvidenceIds: [],
  rationale: "La evidencia queda para revisión humana.",
  uncertainty: "La cobertura depende de las fuentes.",
  limitations: [],
  indices: { polarization: 1, emotionalLoad: 2, publicDataSupport: 3 },
};

const search: Pick<AiSearchProvider, "searchEvidence"> = {
  searchEvidence: async () => ({ outcome: "Evidencia encontrada", excerpts: [], limitations: [], traceEvents: [] }),
};

class FakeAi implements WorkersAiBinding {
  async run(_model: string, input: any): Promise<unknown> {
    return input.messages?.[0]?.content?.includes("Extrae") ? extraction : proposal;
  }
}

function createOpenRouter(response: unknown, error?: Error): OpenRouterModelProvider {
  return {
    isConfigured: true,
    run: vi.fn(async () => {
      if (error) throw error;
      return response;
    }),
  };
}

afterEach(() => vi.useRealTimers());

describe("URL analysis input and extraction", () => {
  it("accepts exactly one text or URL input and returns Spanish validation errors", () => {
    expect(parseAnalysisInput({ text })).toEqual({ input: { kind: "text", text } });
    expect(parseAnalysisInput({ url: "https://example.com/news" })).toEqual({ input: { kind: "url", url: "https://example.com/news" } });
    expect(parseAnalysisInput({ text, url: "https://example.com" }).error).toContain("exactamente uno");
    expect(parseAnalysisInput({ url: "ftp://example.com" }).error).toContain("http:// o https://");
    expect(parseAnalysisInput({ text: "corto" }).error).toContain("20 y 20.000");
  });

  it("blocks private, loopback, link-local and reserved IPs", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("93.184.216.34")).toBe(false);
  });

  it("extracts readable article text without boilerplate", async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => new Response("<html><nav>Menú</nav><article><h1>Título</h1><p>Texto útil.</p><script>secreto()</script></article><footer>Pie</footer></html>", { headers: { "content-type": "text/html" } }));
    const result = await fetchArticleText("https://example.com/news", { fetchImpl, resolveHostname: async () => ["93.184.216.34"] });
    expect(result).toContain("Título");
    expect(result).toContain("Texto útil.");
    expect(result).not.toContain("Menú");
    expect(result).not.toContain("secreto");
    expect(extractReadableText("<p>A &amp; B</p>")).toBe("A & B");
  });

  it("enforces readable content and response size caps", async () => {
    const pdfFetch: typeof fetch = vi.fn(async () => new Response("pdf", { headers: { "content-type": "application/pdf" } }));
    await expect(fetchArticleText("https://example.com/file", { fetchImpl: pdfFetch, resolveHostname: async () => ["93.184.216.34"] })).rejects.toThrow("HTML o texto");
    const oversizedFetch: typeof fetch = vi.fn(async () => new Response("small", { headers: { "content-type": "text/plain", "content-length": "1000001" } }));
    await expect(fetchArticleText("https://example.com/large", { fetchImpl: oversizedFetch, resolveHostname: async () => ["93.184.216.34"] })).rejects.toThrow("límite de tamaño");
    await expect(fetchArticleText("http://127.0.0.1/admin", { fetchImpl: oversizedFetch, resolveHostname: async () => ["127.0.0.1"] })).rejects.toThrow("red privada");
  });

  it("uses Luna, passes rationale, and truncates more than three claims honestly", async () => {
    const lunaClaims = { ...extraction, claims: [claim(0), claim(80), claim(160), claim(240)] };
    const result = await analyzeText({ text, ai: new FakeAi(), search, openRouter: createOpenRouter(lunaClaims) });
    expect(result.claims).toHaveLength(3);
    expect(result.claims[0].claim.rationale).toContain("informe oficial");
    expect(result.claims[0].provenance).toEqual({ provider: "openrouter", modelId: LUNA_EXTRACTION_MODEL });
    expect(result.limitations.join(" ")).toContain("más de 3");
    expect(isClaimExtractionV2(lunaClaims)).toBe(true);
  });

  it("accepts v2 claims without a rationale", () => {
    const { rationale: _rationale, ...claimWithoutRationale } = claim();
    expect(isClaimExtractionV2({ schemaVersion: "claim-extraction.v2", claims: [claimWithoutRationale] })).toBe(true);
  });

  it("falls back to Workers AI with an honest degradation", async () => {
    const result = await analyzeText({ text, ai: new FakeAi(), search, openRouter: createOpenRouter("not json", new Error("503 upstream")) });
    expect(result.claims[0].provenance.provider).toBe("workers-ai");
    expect(result.limitations.join(" ")).toContain("respaldo");
    expect(result.traceEvents.some((event) => event.title === "Respaldo de proveedor" && event.details.includes('"fromProvider":"openrouter"') && event.details.includes('"toProvider":"workers-ai"'))).toBe(true);
  });

  it("bounds a hung extraction stage below the full pipeline budget", async () => {
    vi.useFakeTimers();
    const hung: OpenRouterModelProvider = {
      isConfigured: true,
      run: vi.fn((_model, _input, options) => new Promise<unknown>((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }))),
    };
    const resultPromise = analyzeText({ text, ai: new FakeAi(), search, openRouter: hung });
    await vi.advanceTimersByTimeAsync(EXTRACTION_TIMEOUT_MS);
    const result = await resultPromise;
    expect(result.status).toBe("partial");
    expect(result.limitations.join(" ")).toContain("tiempo");
    expect(hung.run).toHaveBeenCalledWith(LUNA_EXTRACTION_MODEL, expect.anything(), expect.anything());
    expect(PROPOSAL_MODELS).toHaveLength(3);
  });
});
