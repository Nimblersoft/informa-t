// # Spec: docs/specs/sse-analysis.md

import type {
  AnalysisEvent,
  AnalysisEventMap,
  AnalysisEventName,
} from "../shared/analysis-events";

export interface StreamAnalysisOptions {
  text?: string;
  url?: string;
  signal?: AbortSignal;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  onEvent?: (event: AnalysisEvent) => void;
}

export async function streamAnalysis(options: StreamAnalysisOptions): Promise<void> {
  if ((options.text === undefined) === (options.url === undefined)) throw new Error("Indica texto o URL, pero no ambos.");
  const body = options.url !== undefined ? { url: options.url } : { text: options.text };
  const response = await (options.fetchImpl ?? fetch)(options.endpoint ?? "/api/analyses", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    let message = "No fue posible iniciar el análisis.";
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string") message = payload.error;
    } catch {
      // Keep the Spanish fallback when the server does not return JSON.
    }
    throw new Error(message);
  }

  if (!response.body) throw new Error("El servidor no devolvió un flujo de análisis.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "message";
  let eventId = "";
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length === 0) return;
    if (!(eventName in EVENT_NAMES)) {
      eventName = "message";
      dataLines = [];
      return;
    }
    const type = eventName as AnalysisEventName;
    const event = {
      type,
      id: eventId,
      data: JSON.parse(dataLines.join("\n")) as AnalysisEventMap[typeof type],
    } as AnalysisEvent;
    options.onEvent?.(event);
    eventName = "message";
    eventId = "";
    dataLines = [];
  };

  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line === "") {
        dispatch();
      } else if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("id:")) {
        eventId = line.slice(3).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (chunk.done) {
      if (buffer.length > 0) {
        for (const line of buffer.split(/\r?\n/)) {
          if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        }
      }
      dispatch();
      break;
    }
  }
}

const EVENT_NAMES: Record<AnalysisEventName, true> = {
  "analysis.started": true,
  "claim.extracted": true,
  "evidence.retrieved": true,
  "model.completed": true,
  "model.failed": true,
  "consensus.completed": true,
  "analysis.completed": true,
};
