import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { ANALYSIS_EVENT_NAMES, type AnalysisEventName } from "../src/shared/analysis-events";
import { ArticleFetchError } from "../src/server/article-fetch";
import { PROPOSAL_MODELS } from "../src/server/config/models";
import { createAnalysisRoutes } from "../src/server/routes/analyses";
import type { AuditDatabase, AuditStatement } from "../src/server/audit/claim-extraction-audit";
import type { AiSearchProviderResult } from "../src/server/providers/ai-search";
import type { WorkersAiBinding } from "../src/server/providers/workers-ai";

const text = "El instituto oficial reportó cambios verificables en el registro electoral durante junio de 2025.";
const extractionClaim = {
  verbatim: "El instituto oficial reportó cambios verificables en el registro electoral durante junio de 2025.",
  rationale: "El registro oficial permite contrastar esta afirmación.",
  decision: "lista_para_contraste" as const,
};
const extraction = { schemaVersion: "claim-extraction.v4" as const, claims: [extractionClaim] };
const claim = {
  verbatimText: extractionClaim.verbatim,
  normalizedText: extractionClaim.verbatim,
  location: { start: 0, end: extractionClaim.verbatim.length },
  dates: [],
  verifiable: true,
  electorallyRelevant: true,
  sourceAvailability: "no consultada" as const,
  excluded: false,
  extractionDecision: "lista_para_contraste" as const,
  pipelineDisposition: "continuar" as const,
  rationale: extractionClaim.rationale,
};
const proposal = {
  schemaVersion: "proposal.v1" as const,
  reviewFocus: "Contrastar evidencia" as const,
  supportingEvidenceIds: ["evidence-1"],
  contraryEvidenceIds: [],
  rationale: "La evidencia oficial debe ser contrastada por una persona editora.",
  uncertainty: "La cobertura depende del corpus consultado.",
  limitations: [],
  indices: { polarization: 10, emotionalLoad: 20, publicDataSupport: 80 },
};
const trace = {
  id: "trace-evidence-1",
  stage: "Extracción" as const,
  timestamp: "2026-08-15T00:00:00.000Z",
  title: "Evidencia",
  description: "Evidencia oficial recuperada.",
  canonicalHash: "hash",
  status: "Completado",
  details: "{}",
};

function evidenceResult(): AiSearchProviderResult {
  return {
    outcome: "Evidencia encontrada",
    excerpts: [{
      id: "evidence-1", institution: "Instituto oficial", collection: "Registro", title: "Informe oficial", version: "2025", sourceUrl: "https://example.test/source", retrievalDate: "2026-08-15", citationLocation: "p. 1", license: "CC BY", coverageLimits: "Nacional", excerpt: "Fragmento oficial", sha256: "a".repeat(64),
    }],
    limitations: [],
    traceEvents: [trace],
  };
}

class FakeAi implements WorkersAiBinding {
  aborted = false;
  constructor(private readonly failProposals = false) {}
  async run(_model: string, input: any, options?: { signal?: AbortSignal }): Promise<unknown> {
    if (options?.signal?.aborted) {
      this.aborted = true;
      throw new DOMException("aborted", "AbortError");
    }
    if (this.failProposals && !isExtraction(input)) {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          this.aborted = true;
          reject(new DOMException("aborted", "AbortError"));
        };
        options?.signal?.addEventListener("abort", onAbort, { once: true });
          setTimeout(() => {
            options?.signal?.removeEventListener("abort", onAbort);
            reject(new Error("service unavailable"));
          }, 50);
      });
    }
    return isExtraction(input) ? JSON.stringify(extraction) : JSON.stringify(proposal);
  }
}

function createAudit(): AuditDatabase {
  const statement: AuditStatement = { bind: () => statement };
  return { prepare: () => statement, batch: async () => [] };
}

function createTestApp(ai: WorkersAiBinding, now = () => Date.now(), audit = createAudit()) {
  const app = new Hono();
  app.route("/api", createAnalysisRoutes({ ai, search: { searchEvidence: async () => evidenceResult() }, now, audit }));
  return app;
}

async function readEvents(response: Response) {
  const body = await response.text();
  return body.split("\n\n").filter(Boolean).map((block) => {
    const event = block.match(/^event: (.+)$/m)?.[1] as AnalysisEventName;
    const data = JSON.parse(block.match(/^data: (.+)$/m)?.[1] ?? "{}");
    return { event, data };
  });
}

function isExtraction(input: { messages?: Array<{ role: string; content: string }> }): boolean {
  return (input.messages?.[0]?.content ?? "").includes("Extrae") || (input.messages?.[0]?.content ?? "").startsWith("La siguiente respuesta no cumple");
}

describe("POST /api/analyses SSE contract", () => {
  it("emits every successful event type with shared audit metadata and an immediate start", async () => {
    const clock = vi.fn(() => 1_000);
    const response = await createTestApp(new FakeAi(), clock).request("http://local.test/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("content-encoding")).toBe("identity");
    expect(events[0].event).toBe("analysis.started");
    expect(events[0].data.durationMs).toBeLessThan(2_000);
    expect(new Set(events.map((event) => event.event))).toEqual(new Set(ANALYSIS_EVENT_NAMES.filter((name) => name !== "model.failed")));
    for (const event of events) {
      expect(event.data.pipelineVersion).toBe("analysis-sse.v1");
      expect(event.data.promptVersion).toBe("claim-extraction-prompt.v4");
      expect(typeof event.data.durationMs).toBe("number");
      expect(event.data).toHaveProperty("usage");
      expect(typeof event.data.retries).toBe("number");
      expect(Array.isArray(event.data.degradations)).toBe(true);
    }
    expect(events.at(-1)?.event).toBe("analysis.completed");
    expect(events.at(-1)?.data.status).toBe("completed");
  });

  it("keeps completed claims and emits model.failed plus partial terminal status", async () => {
    const events = await readEvents(await createTestApp(new FakeAi(true)).request("http://local.test/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }));
    expect(events.some((event) => event.event === "claim.extracted")).toBe(true);
    expect(events.some((event) => event.event === "model.failed")).toBe(true);
    expect(events.map((event) => event.event)).toContain("model.failed");
    expect(events.at(-1)?.data.status).toBe("partial");
    expect(events.at(-1)?.data.claims).toHaveLength(1);
  });

  it("keeps evidence and proposals when audit binding is absent, but marks the terminal partial", async () => {
    const events = await readEvents(await createAnalysisRoutes({ ai: new FakeAi(), search: { searchEvidence: async () => evidenceResult() } }).request("http://local.test/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }));
    const claimEvent = events.find((event) => event.event === "claim.extracted");

    expect(claimEvent?.data.traceEvent.id).toMatch(/^trace-analysis-/);
    expect(events.some((event) => event.event === "evidence.retrieved")).toBe(true);
    expect(events.some((event) => event.event === "model.completed")).toBe(true);
    expect(claimEvent?.data.degradations.join(" ")).toContain("auditoría interna");
    expect(events.at(-1)?.data.status).toBe("partial");
    expect(events.at(-1)?.data.limitations.join(" ")).toContain("auditoría interna");
  });

  it("rejects invalid input in Spanish without invoking a provider", async () => {
    const ai = new FakeAi();
    const response = await createTestApp(ai).request("http://local.test/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "corto" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "El texto debe tener entre 20 y 20.000 caracteres para analizarlo." });
  });

  it("accepts URL input and preserves claim rationale in the additive SSE field", async () => {
    const response = await createAnalysisRoutes({
      ai: new FakeAi(),
      search: { searchEvidence: async () => evidenceResult() },
      fetchArticle: async () => text,
      audit: createAudit(),
    }).request("http://local.test/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/news" }),
    });
    const events = await readEvents(response);
    expect(events[0].data.inputType).toBe("url");
    expect(events[0].data.sourceUrl).toBe("https://example.com/news");
    expect(events.find((event) => event.event === "claim.extracted")?.data.claims[0].rationale).toContain("registro oficial");
  });

  it("terminates URL extraction failures with an honest limitation and safe diagnostic category", async () => {
    const events = await readEvents(await createAnalysisRoutes({
      ai: new FakeAi(),
      search: { searchEvidence: async () => evidenceResult() },
      fetchArticle: async () => { throw new ArticleFetchError("No fue posible extraer el artículo con el navegador renderizado.", "browser_unavailable"); },
      audit: createAudit(),
    }).request("http://local.test/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/protected" }),
    }));

    expect(events.map((event) => event.event)).toEqual(["analysis.started", "analysis.completed"]);
    expect(events.at(-1)?.data.status).toBe("failed");
    expect(events.at(-1)?.data.claims).toEqual([]);
    expect(events.at(-1)?.data.limitations).toContain("No fue posible extraer el artículo con el navegador renderizado.");
    expect(events.at(-1)?.data.degradations).toContain("url-extraction:browser_unavailable");
  });

  it("returns a cancellable SSE response", async () => {
    const ai = new FakeAi(true);
    const app = createTestApp(ai);
    const abortController = new AbortController();
    const response = await app.request("http://local.test/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: abortController.signal,
    });
    const reader = response.body?.getReader();
    await reader?.read();
    await reader?.read();
    await reader?.read();
    abortController.abort();
    await reader?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(response.status).toBe(200);
  });
});
