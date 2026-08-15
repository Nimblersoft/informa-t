/**
 * @vitest-environment jsdom
 */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LiveAnalysisPanel } from "../src/client/components/LiveAnalysisPanel";

const common = { pipelineVersion: "analysis-sse.v1", promptVersion: "claim-extraction.v2", durationMs: 1, usage: null, retries: 0, degradations: [] } as const;
const claim = { verbatimText: "El registro oficial cambió durante junio de 2025.", normalizedText: "El registro oficial cambió", location: { start: 0, end: 43 }, entities: ["registro"], dates: ["junio de 2025"], verifiable: true, electorallyRelevant: true, sourceAvailability: "no consultada" as const, excluded: false, rationale: "El registro oficial permite contrastar la afirmación." };

afterEach(() => cleanup());

describe("LiveAnalysisPanel", () => {
  it("updates stage progress, links evidence/proposals to trace IDs, and never completes a verdict", async () => {
    const onNavigateToLog = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const events = [
          ["analysis.started", { ...common, analysisId: "a", textLength: 50 }],
          ["claim.extracted", { ...common, analysisId: "a", claims: [claim], provenance: { provider: "workers-ai", modelId: "model-1" }, traceEventId: "trace-claim" }],
          ["evidence.retrieved", { ...common, analysisId: "a", claim, excerpts: [{ id: "source-1", institution: "Instituto", collection: "Colección", title: "Fuente primaria", version: "1", sourceUrl: "https://example.test/source", retrievalDate: "2026-08-15", citationLocation: "p. 1", license: "CC", coverageLimits: "Nacional", excerpt: "Cita oficial", sha256: "a".repeat(64) }], traceEventId: "trace-evidence" }],
          ["model.completed", { ...common, analysisId: "a", claimIndex: 0, proposal: { model: "@cf/zai-org/glm-4.7-flash", provenance: { provider: "openrouter", modelId: "router-model" }, status: "valid", proposal: { schemaVersion: "proposal.v1", reviewFocus: "Contrastar evidencia", supportingEvidenceIds: ["source-1"], contraryEvidenceIds: [], rationale: "Contraste pendiente", uncertainty: "Limitado", limitations: [], indices: { polarization: 1, emotionalLoad: 2, publicDataSupport: 3 } }, retries: 0 }, traceEventId: "trace-model" }],
          ["analysis.completed", { ...common, degradations: ["Una propuesta falló"], analysisId: "a", status: "partial", claims: [{ claim, provenance: { provider: "workers-ai", modelId: "model-1" }, evidence: [], proposals: [], consensus: null }], limitations: ["Una propuesta falló"], traceEventIds: ["trace-evidence"] }],
        ];
        for (const [index, [name, data]] of events.entries()) controller.enqueue(encoder.encode(`id: event-${index}\nevent: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { status: 200 })));

    render(<LiveAnalysisPanel onNavigateToLog={onNavigateToLog} />);
    fireEvent.change(screen.getByTestId("analysis-text-input"), { target: { value: "Texto suficientemente largo para activar el análisis progresivo." } });
    fireEvent.click(screen.getByTestId("analysis-submit"));
    await waitFor(() => expect(screen.getByTestId("analysis-stage-models")).toBeTruthy());
    expect(screen.getByText("Fuente primaria")).toBeTruthy();
    expect(screen.getByText("El registro oficial permite contrastar la afirmación.")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent?.includes("Proveedor: openrouter") === true)).toBeTruthy();
    expect(screen.getByText(/Degradaciones: Una propuesta falló/)).toBeTruthy();
    expect(screen.queryByText("Cierto")).toBeNull();
    expect(screen.queryByText("Falso")).toBeNull();
    fireEvent.click(screen.getByText("Ver traza: trace-evidence"));
    expect(onNavigateToLog).toHaveBeenCalledWith("trace-evidence");
  });
});
