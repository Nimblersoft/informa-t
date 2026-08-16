/**
 * @vitest-environment jsdom
 */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LiveAnalysisPanel } from "../src/client/components/LiveAnalysisPanel";
import { App } from "../src/client/App";

const common = { pipelineVersion: "analysis-sse.v1", promptVersion: "claim-extraction-prompt.v4", durationMs: 1, usage: null, retries: 0, degradations: [] } as const;
const claim = { verbatimText: "El registro oficial cambió durante junio de 2025.", normalizedText: "El registro oficial cambió", location: { start: 0, end: 43 }, entities: ["registro"], dates: ["junio de 2025"], verifiable: true, electorallyRelevant: true, sourceAvailability: "no consultada" as const, excluded: false, extractionDecision: "lista_para_contraste" as const, pipelineDisposition: "continuar" as const, rationale: "El registro oficial permite contrastar la afirmación." };
const traceEvent = { id: "trace-claim", stage: "Extracción" as const, timestamp: "2026-08-15T00:00:00.000Z", title: "Extracción", description: "Decisión del extractor", canonicalHash: "hash", status: "Completado", details: "{}" };

afterEach(() => cleanup());

describe("LiveAnalysisPanel", () => {
  it("updates stage progress, links evidence/proposals to trace IDs, and never completes a verdict", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const events = [
          ["analysis.started", { ...common, analysisId: "a", textLength: 50 }],
          ["claim.extracted", { ...common, analysisId: "a", claims: [claim], provenance: { provider: "workers-ai", modelId: "model-1" }, traceEventId: "trace-claim", traceEvent }],
          ["evidence.retrieved", { ...common, analysisId: "a", claim, excerpts: [{ id: "source-1", institution: "Instituto", collection: "Colección", title: "Fuente primaria", version: "1", sourceUrl: "https://example.test/source", retrievalDate: "2026-08-15", citationLocation: "p. 1", license: "CC", coverageLimits: "Nacional", excerpt: "Cita oficial", sha256: "a".repeat(64) }], traceEventId: "trace-evidence" }],
          ["model.completed", { ...common, analysisId: "a", claimIndex: 0, proposal: { model: "@cf/zai-org/glm-4.7-flash", provenance: { provider: "openrouter", modelId: "router-model" }, status: "valid", proposal: { schemaVersion: "proposal.v1", reviewFocus: "Contrastar evidencia", supportingEvidenceIds: ["source-1"], contraryEvidenceIds: [], rationale: "Contraste pendiente", uncertainty: "Limitado", limitations: [], indices: { polarization: 1, emotionalLoad: 2, publicDataSupport: 3 } }, retries: 0 }, traceEventId: "trace-model" }],
          ["analysis.completed", { ...common, degradations: ["Una propuesta falló"], analysisId: "a", status: "partial", claims: [{ claim, provenance: { provider: "workers-ai", modelId: "model-1" }, evidence: [], proposals: [], consensus: null }], limitations: ["Una propuesta falló"], traceEventIds: ["trace-evidence"] }],
        ];
        for (const [index, [name, data]] of events.entries()) controller.enqueue(encoder.encode(`id: event-${index}\nevent: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { status: 200 })));

    render(<LiveAnalysisPanel />);
    expect((screen.getByTestId("analysis-text-input") as HTMLTextAreaElement).value).toBe("Según los últimos reportes oficiales del INEC, la pobreza por ingresos a nivel nacional se ubicó en el 25,5% en junio de 2025, mientras que la pobreza extrema alcanzó el 8,4%.");
    fireEvent.change(screen.getByTestId("analysis-text-input"), { target: { value: "Texto suficientemente largo para activar el análisis progresivo." } });
    fireEvent.click(screen.getByTestId("analysis-submit"));
    await waitFor(() => expect(screen.getByTestId("analysis-stage-models")).toBeTruthy());
    expect(screen.getByText("Estado: parcial")).toBeTruthy();
    expect(screen.getByText("El resultado se despliega en los extractos, las pestañas de evidencia y modelos, y la bitácora editorial de esta misma vista.")).toBeTruthy();
    expect(screen.getByText(/Una propuesta falló/)).toBeTruthy();
    expect(screen.queryByText("Cierto")).toBeNull();
    expect(screen.queryByText("Falso")).toBeNull();
  });

  it("renders live multi-model output in the shared editorial Models tab", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const events = [
          ["analysis.started", { ...common, analysisId: "live", textLength: 50 }],
          ["claim.extracted", { ...common, analysisId: "live", claims: [claim], provenance: { provider: "workers-ai", modelId: "model-1" }, traceEventId: "trace-claim", traceEvent }],
          ["evidence.retrieved", { ...common, analysisId: "live", claim, excerpts: [{ id: "source-1", institution: "Instituto", collection: "Colección", title: "Fuente primaria", version: "1", sourceUrl: "https://example.test/source", retrievalDate: "2026-08-15", citationLocation: "p. 1", license: "CC", coverageLimits: "Nacional", excerpt: "Cita oficial", sha256: "a".repeat(64) }], traceEventId: "trace-evidence" }],
          ["model.completed", { ...common, analysisId: "live", claimIndex: 0, proposal: { model: "@cf/zai-org/glm-4.7-flash", provenance: { provider: "openrouter", modelId: "router-model" }, status: "valid", proposal: { schemaVersion: "proposal.v1", reviewFocus: "Revisar contexto", supportingEvidenceIds: ["source-1"], contraryEvidenceIds: [], rationale: "Contraste pendiente", uncertainty: "Limitado", limitations: ["Falta precisar el período."], indices: { polarization: 1, emotionalLoad: 2, publicDataSupport: 3 } }, retries: 0 }, traceEventId: "trace-model" }],
          ["analysis.completed", { ...common, analysisId: "live", status: "partial", claims: [], limitations: [], traceEventIds: ["trace-claim"] }],
        ];
        for (const [index, [name, data]] of events.entries()) controller.enqueue(encoder.encode(`id: live-${index}\nevent: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { status: 200 })));

    render(<App mode="live" />);
    fireEvent.click(screen.getByTestId("analysis-submit"));

    const proposalCard = await screen.findByTestId("live-proposal-card-0");
    expect(proposalCard.textContent).toContain("Contraste pendiente");
    expect(proposalCard.textContent).toContain("Limitado");
    expect(proposalCard.textContent).toContain("Falta precisar el período.");
    expect(proposalCard.textContent).toContain("@cf/zai-org/glm-4.7-flash");
    expect(screen.getByTestId("primary-evidence-section").textContent).toContain("El registro oficial cambió durante junio de 2025.");
  });
});
