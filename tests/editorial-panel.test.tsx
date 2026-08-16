/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "../src/client/App";
import { Header } from "../src/client/components/Header";
import { ExtractStream } from "../src/client/components/ExtractStream";
import { AnalysisTabs } from "../src/client/components/AnalysisTabs";
import { EvidencePanel } from "../src/client/components/EvidencePanel";
import { ModelsPanel } from "../src/client/components/ModelsPanel";
import { LogsPanel } from "../src/client/components/LogsPanel";
import { parseDemoCase } from "../src/shared/contracts";
import a1FixtureJson from "../src/fixtures/cases/a1.json";

const a1Fixture = parseDemoCase(a1FixtureJson);

describe("Editorial review panel unit tests", () => {
  afterEach(() => {
    cleanup();
  });
  describe("Header component", () => {
    it("renders case identity, exact development label, and readonly indicator", () => {
      render(
        <Header caseId={a1Fixture.id} caseLabel={a1Fixture.label} />,
      );

      expect(screen.getByTestId("brand-title") || screen.getByText("informa-t")).toBeTruthy();
      expect(screen.getByTestId("case-id").textContent).toBe(`Caso ${a1Fixture.id.toUpperCase()}`);
      expect(screen.getByTestId("case-label").textContent).toBe(a1Fixture.label);
      expect(screen.getByTestId("readonly-indicator").textContent).toContain(
        "Modo de revisión editorial (Solo lectura)",
      );

      // Verify no publish/verdict buttons
      expect(screen.queryByText("Publicar")).toBeNull();
      expect(screen.queryByText("Aprobar")).toBeNull();
    });
  });

  describe("ExtractStream component", () => {
    it("strictly separates primary evidence and related context in distinct non-interleaved regions", () => {
      const onSelectExcerpt = vi.fn();
      const onNavigateToLog = vi.fn();

      render(
        <ExtractStream
          excerpts={a1Fixture.excerpts}
          relatedContext={a1Fixture.relatedContext}
          activeExcerptId={a1Fixture.excerpts[0].id}
          onSelectExcerpt={onSelectExcerpt}
          onNavigateToLog={onNavigateToLog}
        />,
      );

      const primaryRegion = screen.getByTestId("primary-evidence-section");
      const relatedRegion = screen.getByTestId("related-context-section");

      expect(primaryRegion).toBeTruthy();
      expect(relatedRegion).toBeTruthy();

      // Primary region contains primary excerpts
      for (const excerpt of a1Fixture.excerpts) {
        expect(primaryRegion.querySelector(`[data-testid="excerpt-item-${excerpt.id}"]`)).toBeTruthy();
      }
      for (const context of a1Fixture.relatedContext) {
        expect(primaryRegion.querySelector(`[data-testid="context-item-${context.id}"]`)).toBeNull();
      }

      // Related region contains context items, not primary excerpts
      for (const context of a1Fixture.relatedContext) {
        expect(relatedRegion.querySelector(`[data-testid="context-item-${context.id}"]`)).toBeTruthy();
      }
      for (const excerpt of a1Fixture.excerpts) {
        expect(relatedRegion.querySelector(`[data-testid="excerpt-item-${excerpt.id}"]`)).toBeNull();
      }

      // Test click selection
      const secondExcerpt = a1Fixture.excerpts[1];
      fireEvent.click(screen.getByTestId(`excerpt-item-${secondExcerpt.id}`));
      expect(onSelectExcerpt).toHaveBeenCalledWith(secondExcerpt.id);

      // Test log navigation
      const firstExcerpt = a1Fixture.excerpts[0];
      fireEvent.click(screen.getByTestId(`btn-log-${firstExcerpt.id}`));
      expect(onNavigateToLog).toHaveBeenCalledWith(firstExcerpt.logEventId);
    });
  });

  describe("AnalysisTabs component", () => {
    it("provides accessible ARIA roles and handles keyboard arrow navigation", () => {
      const onTabChange = vi.fn();

      render(
        <AnalysisTabs activeTab="evidence" onTabChange={onTabChange}>
          {{
            evidence: <div>Contenido Evidencia</div>,
            models: <div>Contenido Modelos</div>,
            logs: <div>Contenido Logs</div>,
          }}
        </AnalysisTabs>,
      );

      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeTruthy();
      expect(tablist.getAttribute("aria-label")).toBe("Secciones de análisis");

      const tabEvidence = screen.getByTestId("tab-evidence");
      const tabModels = screen.getByTestId("tab-models");
      const tabLogs = screen.getByTestId("tab-logs");

      expect(tabEvidence.getAttribute("role")).toBe("tab");
      expect(tabEvidence.getAttribute("aria-selected")).toBe("true");
      expect(tabEvidence.getAttribute("tabindex")).toBe("0");

      expect(tabModels.getAttribute("role")).toBe("tab");
      expect(tabModels.getAttribute("aria-selected")).toBe("false");
      expect(tabModels.getAttribute("tabindex")).toBe("-1");

      // Keyboard navigation ArrowRight
      fireEvent.keyDown(tabEvidence, { key: "ArrowRight" });
      expect(onTabChange).toHaveBeenCalledWith("models");

      // Keyboard navigation End key
      fireEvent.keyDown(tabEvidence, { key: "End" });
      expect(onTabChange).toHaveBeenCalledWith("logs");

      // Keyboard navigation Home key
      fireEvent.keyDown(tabLogs, { key: "Home" });
      expect(onTabChange).toHaveBeenCalledWith("evidence");
    });
  });

  describe("EvidencePanel component", () => {
    it("displays named indices with 0-100 scale, rubric, justification, explicit heuristic label and no percent signs", () => {
      const onNavigateToLog = vi.fn();

      const { container } = render(
        <EvidencePanel
          indices={a1Fixture.indices}
          onNavigateToLog={onNavigateToLog}
        />,
      );

      for (const index of a1Fixture.indices) {
        const card = screen.getByTestId(`index-card-${index.id}`);
        expect(card).toBeTruthy();
        expect(card.textContent).toContain(index.name);
        expect(card.textContent).toContain(`${index.value}`);
        expect(card.textContent).toContain(`/ ${index.max}`);
        expect(card.textContent).toContain(index.rubric);
        expect(card.textContent).toContain(index.justification);
        expect(card.textContent).toContain(index.heuristicLabel);
      }

      // Assert NO percent sign anywhere in text
      expect(container.textContent).not.toContain("%");

      // Test trace navigation
      const firstIndex = a1Fixture.indices[0];
      fireEvent.click(screen.getByTestId(`btn-trace-${firstIndex.id}`));
      expect(onNavigateToLog).toHaveBeenCalledWith(firstIndex.logEventId);
    });
  });

  describe("ModelsPanel component", () => {
    it("renders exactly the three anonymous proposals without attribution", () => {
      render(<ModelsPanel proposals={a1Fixture.proposals} />);

      for (let i = 0; i < 3; i++) {
        expect(screen.getByTestId(`proposal-card-${i}`)).toBeTruthy();
        expect(screen.getByTestId(`proposal-anon-${i}`).textContent).toContain(
          "Anónima / Sin atribución",
        );
        expect(screen.getByTestId(`proposal-msg-${i}`).textContent).toBe(
          a1Fixture.proposals[i].message,
        );
      }
      expect(screen.queryByTestId("proposal-card-3")).toBeNull();

      // Verify no provider or model attribution
      expect(screen.queryByText(/openai/i)).toBeNull();
      expect(screen.queryByText(/claude/i)).toBeNull();
      expect(screen.queryByText(/gemini/i)).toBeNull();
      expect(screen.queryByText(/gpt/i)).toBeNull();
    });
  });

  describe("LogsPanel component", () => {
    it("filters events by stage, allows expand/collapse, shows side-by-side proposals, and opens citations", () => {
      const onClearFocusedEvent = vi.fn();

      render(
        <LogsPanel
          events={a1Fixture.traceEvents}
          citations={a1Fixture.citations}
          proposals={a1Fixture.proposals}
          focusedEventId="evt-analisis"
          onClearFocusedEvent={onClearFocusedEvent}
        />,
      );

      // Verify focused event is rendered and highlighted
      const focusedCard = screen.getByTestId("event-card-evt-analisis");
      expect(focusedCard.className).toContain("highlighted");

      // Verify filter select
      const filterSelect = screen.getByTestId("stage-filter");
      expect(filterSelect).toBeTruthy();

      // Verify side-by-side comparison
      expect(screen.getByTestId("side-by-side-comparison")).toBeTruthy();
      for (let i = 0; i < 3; i++) {
        expect(screen.getByTestId(`comparison-col-${i}`)).toBeTruthy();
      }

      // Verify auditable citation links
      for (const cite of a1Fixture.citations) {
        const linkCite = screen.getByTestId(`link-cite-${cite.id}`);
        expect(linkCite.getAttribute("href")).toBe(cite.url);
        expect(linkCite.getAttribute("target")).toBe("_blank");
        expect(linkCite.getAttribute("rel")).toBe("noopener noreferrer");
      }
    });
  });

  describe("App-level anti-drift test", () => {
    beforeEach(() => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
        const urlStr = typeof input === "string" ? input : input.toString();
        if (urlStr.includes("/api/demo/cases/a1")) {
          return new Response(JSON.stringify(a1FixtureJson), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("renders all case data strictly from the served fixture payload with exact anti-drift parity", async () => {
      const { container } = render(<App />);

      // Wait for loading to finish and shell to be ready
      const shell = await screen.findByTestId("editorial-shell");
      await waitFor(() => {
        expect(shell.getAttribute("data-ready")).toBe("true");
      });

      // Verify case identity and label match fixture
      expect(screen.getByTestId("case-id").textContent).toBe(`Caso ${a1Fixture.id.toUpperCase()}`);
      expect(screen.getByTestId("case-label").textContent).toBe(a1Fixture.label);

      // Verify all excerpts match fixture payload dynamically
      for (const excerpt of a1Fixture.excerpts) {
        const excerptCard = screen.getByTestId(`excerpt-item-${excerpt.id}`);
        expect(excerptCard.textContent).toContain(excerpt.title);
        expect(excerptCard.textContent).toContain(excerpt.quote);
        expect(excerptCard.textContent).toContain(excerpt.speaker);
        expect(excerptCard.textContent).toContain(excerpt.sourceType);
      }

      // Verify all related context items match fixture payload dynamically
      for (const ctx of a1Fixture.relatedContext) {
        const ctxCard = screen.getByTestId(`context-item-${ctx.id}`);
        expect(ctxCard.textContent).toContain(ctx.title);
        expect(ctxCard.textContent).toContain(ctx.description);
        expect(ctxCard.textContent).toContain(ctx.reference);
      }

      // Verify Evidencia tab indices match fixture payload dynamically
      for (const idx of a1Fixture.indices) {
        const idxCard = screen.getByTestId(`index-card-${idx.id}`);
        expect(idxCard.textContent).toContain(idx.name);
        expect(idxCard.textContent).toContain(`${idx.value}`);
        expect(idxCard.textContent).toContain(`/ ${idx.max}`);
        expect(idxCard.textContent).toContain(idx.rubric);
        expect(idxCard.textContent).toContain(idx.justification);
        expect(idxCard.textContent).toContain(idx.heuristicLabel);
      }

      // Switch to Models tab and verify proposals match fixture payload
      fireEvent.click(screen.getByTestId("tab-models"));
      for (let i = 0; i < a1Fixture.proposals.length; i++) {
        expect(screen.getByTestId(`proposal-msg-${i}`).textContent).toBe(
          a1Fixture.proposals[i].message,
        );
      }

      // Switch to Logs tab and verify trace events and citations match fixture payload
      fireEvent.click(screen.getByTestId("tab-logs"));
      for (const evt of a1Fixture.traceEvents) {
        const evtCard = screen.getByTestId(`event-card-${evt.id}`);
        expect(evtCard.textContent).toContain(evt.stage);
        expect(evtCard.textContent).toContain(evt.title);
        expect(evtCard.textContent).toContain(evt.description);
      }

      for (const cite of a1Fixture.citations) {
        const citeCard = screen.getByTestId(`citation-${cite.id}`);
        expect(citeCard.textContent).toContain(cite.title);
        expect(citeCard.textContent).toContain(cite.publisher);
        expect(citeCard.textContent).toContain(cite.type);
        const link = screen.getByTestId(`link-cite-${cite.id}`);
        expect(link.getAttribute("href")).toBe(cite.url);
      }

      // The prefilled live claim may use percentages; demo index cards remain raw 0-100 values.
      fireEvent.click(screen.getByTestId("tab-evidence"));
      expect(screen.getByTestId(`index-card-${a1Fixture.indices[0].id}`).textContent).not.toContain("%");
    });
  });
});
