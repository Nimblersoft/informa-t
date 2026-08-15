import { describe, expect, it } from "vitest";

import { streamAnalysis } from "../src/client/analysis-stream";
import { ANALYSIS_EVENT_NAMES } from "../src/shared/analysis-events";

function sseResponse() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const [index, name] of ANALYSIS_EVENT_NAMES.entries()) {
        controller.enqueue(encoder.encode(`id: event-${index}\nevent: ${name}\ndata: ${JSON.stringify({ pipelineVersion: "analysis-sse.v1", promptVersion: "claim-extraction.v3", durationMs: index, usage: null, retries: 0, degradations: [] })}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("analysis SSE client", () => {
  it("parses event, id, and JSON data for every contract event", async () => {
    const events: string[] = [];
    await streamAnalysis({ text: "Texto de prueba suficientemente largo para el análisis.", fetchImpl: async () => sseResponse(), onEvent: (event) => events.push(`${event.id}:${event.type}`) });
    expect(events).toEqual(ANALYSIS_EVENT_NAMES.map((name, index) => `event-${index}:${name}`));
  });

  it("surfaces Spanish server validation errors", async () => {
    const response = new Response(JSON.stringify({ error: "El texto debe tener entre 20 y 20.000 caracteres para analizarlo." }), { status: 400 });
    await expect(streamAnalysis({ text: "corto", fetchImpl: async () => response })).rejects.toThrow("entre 20 y 20.000");
  });

  it("sends URL input without changing the SSE parser", async () => {
    let body = "";
    await streamAnalysis({
      url: "https://example.com/noticia",
      fetchImpl: async (_input, init) => {
        body = String(init?.body);
        return sseResponse();
      },
    });
    expect(JSON.parse(body)).toEqual({ url: "https://example.com/noticia" });
  });
});
