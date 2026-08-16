import { afterEach, describe, expect, it, vi } from "vitest";

import { ArticleFetchError, extractReadableText, fetchArticleText, isPrivateIp } from "../src/server/article-fetch";
import { EXTRACTION_ATTEMPT_TIMEOUT_MS, EXTRACTION_TIMEOUT_MS, LUNA_EXTRACTION_MODEL, PROPOSAL_MODELS } from "../src/server/config/models";
import { analyzeText } from "../src/server/pipeline/analyze-text";
import type { AiSearchProvider } from "../src/server/providers/ai-search";
import type { OpenRouterModelProvider } from "../src/server/providers/openrouter";
import type { WorkersAiBinding } from "../src/server/providers/workers-ai";
import { isClaimExtractionV4, parseAnalysisInput, type ClaimExtractionV4, type ProposalV1 } from "../src/shared/contracts";

const text = "La autoridad electoral publicó un informe verificable durante junio de 2025.";

function claim(rationale = "El informe oficial permitiría contrastar esta afirmación."): ClaimExtractionV4["claims"][number] {
  return {
    verbatim: text,
    rationale,
    decision: "lista_para_contraste",
  };
}

const extraction: ClaimExtractionV4 = { schemaVersion: "claim-extraction.v4", claims: [claim()] };
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

  it("uses Browser Run content after a safe direct-fetch rejection", async () => {
    const browser = {
      quickAction: vi.fn(async () => new Response(JSON.stringify({ success: true, result: "<html><article><h1>Artículo renderizado</h1><p>Contenido protegido.</p></article></html>" }), { headers: { "content-type": "application/json" } })),
    };
    const fetchImpl: typeof fetch = vi.fn(async () => new Response("blocked", { status: 403, headers: { "content-type": "text/html" } }));

    await expect(fetchArticleText("https://example.com/protected", {
      fetchImpl,
      browser,
      resolveHostname: async () => ["93.184.216.34"],
    })).resolves.toContain("Contenido protegido.");
    expect(browser.quickAction).toHaveBeenCalledWith("content", expect.objectContaining({ url: "https://example.com/protected" }));
  });

  it("rejects rendered error pages and boilerplate-only pages before claim analysis", async () => {
    const notFoundFetch: typeof fetch = vi.fn(async () => new Response("<html><body><nav>Inicio</nav><main>404 - Page not found</main><footer>Licencia CC BY</footer></body></html>", { headers: { "content-type": "text/html" } }));
    await expect(fetchArticleText("https://example.com/missing", { fetchImpl: notFoundFetch, resolveHostname: async () => ["93.184.216.34"] }))
      .rejects.toMatchObject({ diagnosticCategory: "not_article" });

    const boilerplateFetch: typeof fetch = vi.fn(async () => new Response("<html><nav>Menú Inicio Buscar</nav><footer>Licencia CC BY 4.0 · Todos los derechos reservados</footer></html>", { headers: { "content-type": "text/html" } }));
    await expect(fetchArticleText("https://example.com/template", { fetchImpl: boilerplateFetch, resolveHostname: async () => ["93.184.216.34"] }))
      .rejects.toMatchObject({ diagnosticCategory: "not_article" });
  });

  it("rejects Browser Run output that is a rendered not-found page", async () => {
    const browser = {
      quickAction: vi.fn(async () => new Response(JSON.stringify({ success: true, result: "<html><main>Página no encontrada</main></html>" }), { headers: { "content-type": "application/json" } })),
    };
    const rejected: typeof fetch = vi.fn(async () => new Response("blocked", { status: 403 }));
    await expect(fetchArticleText("https://example.com/protected", { fetchImpl: rejected, browser, resolveHostname: async () => ["93.184.216.34"] }))
      .rejects.toMatchObject({ diagnosticCategory: "not_article" });
  });

  it("never sends an unsafe redirect to Browser Run", async () => {
    const browser = { quickAction: vi.fn() };
    const fetchImpl: typeof fetch = vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }));

    await expect(fetchArticleText("https://example.com/redirect", {
      fetchImpl,
      browser,
      resolveHostname: async () => ["93.184.216.34"],
    })).rejects.toMatchObject({ diagnosticCategory: "unsafe_target" });
    expect(browser.quickAction).not.toHaveBeenCalled();
  });

  it("normalizes transport, timeout, and Browser Run failures without upstream details", async () => {
    const notFound: typeof fetch = vi.fn(async () => new Response("not found", { status: 404 }));
    await expect(fetchArticleText("https://example.com/missing", { fetchImpl: notFound, resolveHostname: async () => ["93.184.216.34"] }))
      .rejects.toMatchObject({ diagnosticCategory: "http_status" });

    const transport = vi.fn(async () => { throw new Error("secret upstream response body"); }) as typeof fetch;
    await expect(fetchArticleText("https://example.com/offline", { fetchImpl: transport, resolveHostname: async () => ["93.184.216.34"] }))
      .rejects.toMatchObject({ diagnosticCategory: "transport", message: "No se pudo conectar con la fuente del artículo." });

    const browser = { quickAction: vi.fn(async () => new Response("fallo interno", { status: 503 })) };
    const rejected: typeof fetch = vi.fn(async () => new Response("blocked", { status: 403 }));
    await expect(fetchArticleText("https://example.com/protected", { fetchImpl: rejected, browser, resolveHostname: async () => ["93.184.216.34"] }))
      .rejects.toMatchObject({ diagnosticCategory: "browser_unavailable" });

    vi.useFakeTimers();
    const hung: typeof fetch = vi.fn((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));
    const pending = fetchArticleText("https://example.com/hung", { fetchImpl: hung, timeoutMs: 100, resolveHostname: async () => ["93.184.216.34"] });
    const timeoutAssertion = expect(pending).rejects.toMatchObject({ diagnosticCategory: "timeout" });
    await vi.advanceTimersByTimeAsync(100);
    await timeoutAssertion;
  });

  it("uses Luna, passes rationale, and truncates more than three claims honestly", async () => {
    const lunaClaims = { ...extraction, claims: [claim(), claim(), claim(), claim()] };
    const result = await analyzeText({ text, ai: new FakeAi(), search, openRouter: createOpenRouter(lunaClaims) });
    expect(result.claims).toHaveLength(3);
    expect(result.claims[0].claim.rationale).toContain("informe oficial");
    expect(result.claims[0].provenance).toEqual({ provider: "openrouter", modelId: LUNA_EXTRACTION_MODEL });
    expect(result.limitations.join(" ")).toContain("más de 3");
    expect(isClaimExtractionV4(lunaClaims)).toBe(true);
  });

  it("requires a rationale and rejects model-supplied derived fields in v4", () => {
    expect(isClaimExtractionV4({ schemaVersion: "claim-extraction.v4", claims: [{ ...claim(), normalizedText: "no permitido" }] })).toBe(false);
    expect(isClaimExtractionV4({ schemaVersion: "claim-extraction.v4", claims: [{ ...claim(), rationale: "" }] })).toBe(false);
  });

  it("falls back to Workers AI with an honest degradation", async () => {
    const result = await analyzeText({ text, ai: new FakeAi(), search, openRouter: createOpenRouter("not json", new Error("503 upstream")) });
    expect(result.claims[0].provenance.provider).toBe("workers-ai");
    expect(result.limitations.join(" ")).toContain("respaldo");
    expect(result.traceEvents.some((event) => event.title === "Respaldo de proveedor" && event.details.includes('"fromProvider":"openrouter"') && event.details.includes('"toProvider":"workers-ai"'))).toBe(true);
  });

  it("retries a timed-out extraction attempt once and respects the 45-second stage ceiling", async () => {
    vi.useFakeTimers();
    let calls = 0;
    let extractionCalls = 0;
    const hung: WorkersAiBinding = {
      run: vi.fn((_model, _input, options) => {
        calls += 1;
        const isExtractionRequest = (_input as { messages?: Array<{ content?: string }> }).messages?.[0]?.content?.includes("Extrae") ?? false;
        if (!isExtractionRequest) return Promise.resolve(proposal);
        extractionCalls += 1;
        if (extractionCalls === 2) return Promise.resolve(extraction);
        return new Promise<unknown>((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
      }),
    };
    const resultPromise = analyzeText({ text, ai: hung, search });
    await vi.advanceTimersByTimeAsync(EXTRACTION_ATTEMPT_TIMEOUT_MS);
    const result = await resultPromise;
    expect(result.status).toBe("partial");
    expect(extractionCalls).toBe(2);
    expect(hung.run).toHaveBeenCalledWith("@cf/zai-org/glm-4.7-flash", expect.anything(), expect.anything());
    expect(EXTRACTION_TIMEOUT_MS).toBe(45_000);
    expect(PROPOSAL_MODELS).toHaveLength(3);
  });

  it("stops two hung extraction attempts at the stage ceiling", async () => {
    vi.useFakeTimers();
    const hung: WorkersAiBinding = {
      run: vi.fn((_model, _input, options) => new Promise<unknown>((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }))),
    };
    const resultPromise = analyzeText({ text, ai: hung, search });
    await vi.advanceTimersByTimeAsync(EXTRACTION_TIMEOUT_MS);
    const result = await resultPromise;

    expect(result.status).toBe("partial");
    expect(result.limitations.join(" ")).toContain("tiempo");
    expect(hung.run).toHaveBeenCalledTimes(2);
  });
});
