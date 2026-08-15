import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { ANALYSIS_EVENT_NAMES, type AnalysisEventName } from "../src/shared/analysis-events";
import { PROPOSAL_MODELS } from "../src/server/config/models";
import { createAnalysisRoutes } from "../src/server/routes/analyses";
import type { AiSearchProviderResult } from "../src/server/providers/ai-search";
import type { WorkersAiBinding } from "../src/server/providers/workers-ai";

const text = "El instituto oficial reportó cambios verificables en el registro electoral durante junio de 2025.";
const claim = {
  verbatimText: "El instituto oficial reportó cambios verificables en el registro electoral durante junio de 2025.",
  normalizedText: "El instituto oficial reportó cambios en el registro electoral",
  location: { start: 0, end: 92 },
  entities: ["instituto oficial"],
  dates: ["junio de 2025"],
  verifiable: true,
  electorallyRelevant: true,
  sourceAvailability: "no consultada" as const,
  excluded: false,
};
const extraction = { schemaVersion: "claim-extraction.v1" as const, claims: [claim] };
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
        }, 5);
      });
    }
    return isExtraction(input) ? JSON.stringify(extraction) : JSON.stringify(proposal);
  }
}

function createTestApp(ai: WorkersAiBinding, now = () => Date.now()) {
  const app = new Hono();
  app.route("/api", createAnalysisRoutes({ ai, search: { searchEvidence: async () => evidenceResult() }, now }));
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
      expect(event.data.promptVersion).toBe("text-analysis.v1");
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

  it("propagates client cancellation to the in-flight fake model", async () => {
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
    abortController.abort();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(ai.aborted).toBe(true);
    await reader?.cancel();
  });
});
