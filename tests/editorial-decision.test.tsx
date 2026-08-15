/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EditorialDecision } from "../src/client/components/EditorialDecision";
import * as exportModule from "../src/client/export";
import type { ClaimItem } from "../src/shared/claim-review";

describe("EditorialDecision Component Unit Tests", () => {
  const sampleClaims: ClaimItem[] = [
    {
      id: "ext-1",
      title: "Aumento del padrón electoral sin auditoría",
      quote: "El padrón electoral aumentó un 40 en los últimos dos meses sin auditoría técnica independiente.",
      speaker: "Intervención en debate público",
      timestamp: "Registro primario 00:14:22",
      sourceType: "Audio / Transcripción verificada",
    },
    {
      id: "ext-2",
      title: "Actas de escrutinio y verificación criptográfica",
      quote: "Las actas de escrutinio preliminar no cuentan con código de verificación criptográfica según el protocolo electoral.",
      speaker: "Conferencia de prensa",
      timestamp: "Registro primario 00:32:05",
      sourceType: "Declaración en video",
    },
  ];

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("Initial empty state and isolation", () => {
    it("renders with empty author, null category, empty justification, and disabled export buttons", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      const authorInput = screen.getByTestId("editorial-author-input") as HTMLInputElement;
      const categorySelect = screen.getByTestId("editorial-category-select") as unknown as HTMLSelectElement;
      const justificationInput = screen.getByTestId("editorial-justification-input") as HTMLTextAreaElement;

      expect(authorInput.value).toBe("");
      expect(categorySelect.value).toBe("");
      expect(justificationInput.value).toBe("");

      const btnClaimReview = screen.getByTestId("btn-export-claimreview") as HTMLButtonElement;
      const btnTrace = screen.getByTestId("btn-export-trace") as HTMLButtonElement;

      expect(btnClaimReview.disabled).toBe(true);
      expect(btnTrace.disabled).toBe(true);

      // Verify withdraw button is not present when category is null
      expect(screen.queryByTestId("btn-withdraw-decision")).toBeNull();

      // Validation feedback message is visible
      expect(screen.getByTestId("editorial-validation-msg")).toBeTruthy();
    });

    it("displays exactly the six contract categories in the select dropdown plus the empty default", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      const categorySelect = screen.getByTestId("editorial-category-select") as unknown as HTMLSelectElement;
      const options = Array.from(categorySelect.options).map((opt) => opt.value);

      expect(options).toEqual([
        "",
        "Cierto",
        "Falso",
        "Impreciso",
        "Engañoso",
        "Sátira",
        "Inverificable",
      ]);
    });
  });

  describe("Client-side export gating", () => {
    it("keeps export buttons disabled when only author is provided", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      fireEvent.change(screen.getByTestId("editorial-author-input"), {
        target: { value: "Periodista A" },
      });

      expect((screen.getByTestId("btn-export-claimreview") as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByTestId("btn-export-trace") as HTMLButtonElement).disabled).toBe(true);
    });

    it("keeps export buttons disabled when only category is selected", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Impreciso" },
      });

      expect((screen.getByTestId("btn-export-claimreview") as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByTestId("btn-export-trace") as HTMLButtonElement).disabled).toBe(true);
    });

    it("keeps export buttons disabled when only justification is provided", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      fireEvent.change(screen.getByTestId("editorial-justification-input"), {
        target: { value: "Justificación detallada." },
      });

      expect((screen.getByTestId("btn-export-claimreview") as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByTestId("btn-export-trace") as HTMLButtonElement).disabled).toBe(true);
    });

    it("keeps export buttons disabled if author or justification is whitespace only", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      fireEvent.change(screen.getByTestId("editorial-author-input"), {
        target: { value: "   " },
      });
      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Falso" },
      });
      fireEvent.change(screen.getByTestId("editorial-justification-input"), {
        target: { value: "  \n  " },
      });

      expect((screen.getByTestId("btn-export-claimreview") as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByTestId("btn-export-trace") as HTMLButtonElement).disabled).toBe(true);
    });

    it("enables export buttons when author, category, and non-whitespace justification are present", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      fireEvent.change(screen.getByTestId("editorial-author-input"), {
        target: { value: "Periodista Responsable" },
      });
      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Impreciso" },
      });
      fireEvent.change(screen.getByTestId("editorial-justification-input"), {
        target: { value: "La afirmación mezcla datos preliminares no consolidados." },
      });

      const btnClaimReview = screen.getByTestId("btn-export-claimreview") as HTMLButtonElement;
      const btnTrace = screen.getByTestId("btn-export-trace") as HTMLButtonElement;

      expect(btnClaimReview.disabled).toBe(false);
      expect(btnTrace.disabled).toBe(false);

      expect(screen.getByTestId("editorial-ready-msg")).toBeTruthy();
    });
  });

  describe("State machine: selection, change, and withdrawal events", () => {
    it("generates three distinct distinguishable events (selected, changed, withdrawn)", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      // Fill author & justification
      fireEvent.change(screen.getByTestId("editorial-author-input"), {
        target: { value: "Editor Principal" },
      });
      fireEvent.change(screen.getByTestId("editorial-justification-input"), {
        target: { value: "Justificación en curso." },
      });

      // 1. Initial selection: empty -> Impreciso
      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Impreciso" },
      });

      // Withdraw button appears
      const withdrawBtn = screen.getByTestId("btn-withdraw-decision");
      expect(withdrawBtn).toBeTruthy();

      // 2. Change category: Impreciso -> Falso
      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Falso" },
      });

      // 3. Withdraw decision
      fireEvent.click(screen.getByTestId("btn-withdraw-decision"));

      // Category should be reset to empty
      const categorySelect = screen.getByTestId("editorial-category-select") as unknown as HTMLSelectElement;
      expect(categorySelect.value).toBe("");

      // Open trace history viewer
      fireEvent.click(screen.getByTestId("btn-toggle-trace-history"));

      const viewer = screen.getByTestId("editorial-trace-viewer");
      expect(viewer).toBeTruthy();

      // Verify all 3 events are displayed
      const eventItems = viewer.querySelectorAll(".trace-event-entry");
      expect(eventItems).toHaveLength(3);

      expect(eventItems[0].className).toContain("event-type-selected");
      expect(eventItems[0].textContent).toContain("selected");
      expect(eventItems[0].textContent).toContain("Impreciso");

      expect(eventItems[1].className).toContain("event-type-changed");
      expect(eventItems[1].textContent).toContain("changed");
      expect(eventItems[1].textContent).toContain("Falso");

      expect(eventItems[2].className).toContain("event-type-withdrawn");
      expect(eventItems[2].textContent).toContain("withdrawn");
    });
  });

  describe("Export downloads execution", () => {
    beforeEach(() => {
      vi.spyOn(exportModule, "downloadClaimReviewJsonLd").mockImplementation(() => {});
      vi.spyOn(exportModule, "downloadEditorialTrace").mockImplementation(() => {});
    });

    it("triggers downloadClaimReviewJsonLd with valid Schema.org structure upon click", () => {
      render(
        <EditorialDecision
          caseId="a1"
          claims={sampleClaims}
          caseUrl="https://informa-t.local/cases/a1"
        />,
      );

      fireEvent.change(screen.getByTestId("editorial-author-input"), {
        target: { value: "Periodista A" },
      });
      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Impreciso" },
      });
      fireEvent.change(screen.getByTestId("editorial-justification-input"), {
        target: { value: "Discrepancia en las cifras auditadas." },
      });

      fireEvent.click(screen.getByTestId("btn-export-claimreview"));

      expect(exportModule.downloadClaimReviewJsonLd).toHaveBeenCalledTimes(1);
      const [caseIdArg, claimReviewArg] = vi.mocked(exportModule.downloadClaimReviewJsonLd).mock.calls[0];

      expect(caseIdArg).toBe("a1");
      expect(claimReviewArg["@context"]).toBe("https://schema.org");
      expect(claimReviewArg["@type"]).toBe("ClaimReview");
      expect(claimReviewArg.author.name).toBe("Periodista A");
      expect(claimReviewArg.reviewRating.alternateName).toBe("Impreciso");
      expect(claimReviewArg.reviewRating.ratingValue).toBe(3);
      expect(claimReviewArg.reviewBody).toBe("Discrepancia en las cifras auditadas.");
      expect(claimReviewArg.hasPart).toHaveLength(2);
    });

    it("triggers downloadEditorialTrace with full history of editorial events", () => {
      render(<EditorialDecision caseId="a1" claims={sampleClaims} />);

      fireEvent.change(screen.getByTestId("editorial-author-input"), {
        target: { value: "Periodista B" },
      });
      fireEvent.change(screen.getByTestId("editorial-justification-input"), {
        target: { value: "Justificación de prueba." },
      });

      // Select, change, withdraw, re-select
      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Cierto" },
      });
      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Impreciso" },
      });
      fireEvent.click(screen.getByTestId("btn-withdraw-decision"));
      fireEvent.change(screen.getByTestId("editorial-category-select"), {
        target: { value: "Engañoso" },
      });

      fireEvent.click(screen.getByTestId("btn-export-trace"));

      expect(exportModule.downloadEditorialTrace).toHaveBeenCalledTimes(1);
      const [caseIdArg, traceArg] = vi.mocked(exportModule.downloadEditorialTrace).mock.calls[0];

      expect(caseIdArg).toBe("a1");
      expect(traceArg.exportType).toBe("informa-t.editorial-trace");
      expect(traceArg.currentDecision.category).toBe("Engañoso");
      expect(traceArg.currentDecision.isExportReady).toBe(true);
      expect(traceArg.events).toHaveLength(4);
      expect(traceArg.events.map((e) => e.type)).toEqual([
        "selected",
        "changed",
        "withdrawn",
        "selected",
      ]);
    });
  });
});
