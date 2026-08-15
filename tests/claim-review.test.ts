import { describe, expect, it } from "vitest";
import {
  buildClaimReviewJsonLd,
  buildEditorialTraceExport,
  getCategoryNumericRating,
  type ClaimItem,
  type EditorialEvent,
} from "../src/shared/claim-review";
import { CATEGORIES, type Category } from "../src/shared/contracts";

describe("ClaimReview JSON-LD and Editorial Trace Unit Tests", () => {
  const singleClaim: ClaimItem = {
    id: "ext-1",
    title: "Aumento del padrón electoral sin auditoría",
    quote: "El padrón electoral aumentó un 40 en los últimos dos meses sin auditoría técnica independiente.",
    speaker: "Intervención en debate público",
    timestamp: "Registro primario 00:14:22",
    sourceType: "Audio / Transcripción verificada",
  };

  const multiClaims: ClaimItem[] = [
    singleClaim,
    {
      id: "ext-2",
      title: "Actas de escrutinio y verificación criptográfica",
      quote: "Las actas de escrutinio preliminar no cuentan con código de verificación criptográfica.",
      speaker: "Conferencia de prensa",
      timestamp: "Registro primario 00:32:05",
      sourceType: "Declaración en video",
    },
  ];

  describe("Single-claim ClaimReview JSON-LD builder", () => {
    it("builds valid single-claim ClaimReview JSON-LD strictly from human decision and claim input", () => {
      const decision = {
        author: "Periodista Editor A",
        category: "Impreciso" as Category,
        justification: "Los datos preliminares no corresponden a la cifra consolidada oficial.",
        timestamp: "2026-08-15T10:00:00.000Z",
      };

      const result = buildClaimReviewJsonLd(decision, singleClaim, {
        caseUrl: "https://informa-t.local/cases/a1",
      });

      expect(result["@context"]).toBe("https://schema.org");
      expect(result["@type"]).toBe("ClaimReview");
      expect(result.datePublished).toBe("2026-08-15T10:00:00.000Z");
      expect(result.url).toBe("https://informa-t.local/cases/a1");
      expect(result.author).toEqual({
        "@type": "Person",
        name: "Periodista Editor A",
      });
      expect(result.claimReviewed).toBe(singleClaim.title);
      expect(result.reviewRating).toEqual({
        "@type": "Rating",
        ratingValue: 3,
        bestRating: 5,
        worstRating: 1,
        alternateName: "Impreciso",
      });
      expect(result.reviewBody).toBe(decision.justification);
      expect(result.itemReviewed).toEqual({
        "@type": "Claim",
        name: singleClaim.title,
        text: singleClaim.quote,
        author: {
          "@type": "Person",
          name: singleClaim.speaker,
        },
        datePublished: singleClaim.timestamp,
        appearance: singleClaim.sourceType,
      });
      expect(result.hasPart).toBeUndefined();
    });
  });

  describe("Multi-claim ClaimReview JSON-LD builder", () => {
    it("builds valid multi-claim ClaimReview JSON-LD with hasPart links", () => {
      const decision = {
        author: "Mesa de Verificación",
        category: "Falso" as Category,
        justification: "Ambas afirmaciones carecen de respaldo en las resoluciones administrativas electorales.",
        timestamp: "2026-08-15T10:30:00.000Z",
      };

      const result = buildClaimReviewJsonLd(decision, multiClaims);

      expect(result["@context"]).toBe("https://schema.org");
      expect(result["@type"]).toBe("ClaimReview");
      expect(result.author.name).toBe("Mesa de Verificación");
      expect(result.reviewRating.alternateName).toBe("Falso");
      expect(result.reviewRating.ratingValue).toBe(1);
      expect(result.itemReviewed).toBeUndefined();
      expect(result.hasPart).toBeDefined();
      expect(Array.isArray(result.hasPart)).toBe(true);
      expect(result.hasPart).toHaveLength(2);

      expect(result.hasPart![0]).toEqual({
        "@type": "Claim",
        name: multiClaims[0].title,
        text: multiClaims[0].quote,
        author: {
          "@type": "Person",
          name: multiClaims[0].speaker,
        },
        datePublished: multiClaims[0].timestamp,
        appearance: multiClaims[0].sourceType,
      });

      expect(result.hasPart![1]).toEqual({
        "@type": "Claim",
        name: multiClaims[1].title,
        text: multiClaims[1].quote,
        author: {
          "@type": "Person",
          name: multiClaims[1].speaker,
        },
        datePublished: multiClaims[1].timestamp,
        appearance: multiClaims[1].sourceType,
      });
    });
  });

  describe("Closed category set validation and ratings", () => {
    it("validates all 6 permitted closed categories correctly", () => {
      for (const cat of CATEGORIES) {
        const rating = getCategoryNumericRating(cat);
        expect(typeof rating).toBe("number");
        expect(rating).toBeGreaterThanOrEqual(0);
        expect(rating).toBeLessThanOrEqual(5);

        const result = buildClaimReviewJsonLd(
          {
            author: "Editor Test",
            category: cat,
            justification: `Evaluación justificada para ${cat}`,
          },
          singleClaim,
        );
        expect(result.reviewRating.alternateName).toBe(cat);
        expect(result.reviewRating.ratingValue).toBe(rating);
      }
    });

    it("rejects invalid or unknown categories", () => {
      expect(() =>
        buildClaimReviewJsonLd(
          {
            author: "Editor Test",
            // @ts-expect-error testing invalid category
            category: "Verdadero",
            justification: "Justificación de prueba",
          },
          singleClaim,
        ),
      ).toThrowError(/Invalid category/);

      expect(() =>
        buildClaimReviewJsonLd(
          {
            author: "Editor Test",
            // @ts-expect-error testing invalid category
            category: "Parcialmente Falso",
            justification: "Justificación de prueba",
          },
          singleClaim,
        ),
      ).toThrowError(/Invalid category/);
    });
  });

  describe("Validation boundaries — requires human input", () => {
    it("throws when author is empty or whitespace only", () => {
      expect(() =>
        buildClaimReviewJsonLd(
          {
            author: "   ",
            category: "Cierto",
            justification: "Justificación válida",
          },
          singleClaim,
        ),
      ).toThrowError(/author is required/i);
    });

    it("throws when justification is empty or whitespace only", () => {
      expect(() =>
        buildClaimReviewJsonLd(
          {
            author: "Editor Válido",
            category: "Cierto",
            justification: "   \n\t  ",
          },
          singleClaim,
        ),
      ).toThrowError(/justification is required/i);
    });

    it("throws when no claims are supplied", () => {
      expect(() =>
        buildClaimReviewJsonLd(
          {
            author: "Editor Válido",
            category: "Cierto",
            justification: "Justificación válida",
          },
          [],
        ),
      ).toThrowError(/at least one claim/i);
    });
  });

  describe("Editorial trace export builder", () => {
    it("builds an auditable trace export with events and decision state", () => {
      const events: EditorialEvent[] = [
        {
          id: "evt-1",
          type: "selected",
          timestamp: "2026-08-15T11:00:00.000Z",
          category: "Cierto",
          previousCategory: null,
          author: "Periodista 1",
          details: "Selección inicial de categoría",
        },
        {
          id: "evt-2",
          type: "changed",
          timestamp: "2026-08-15T11:05:00.000Z",
          category: "Impreciso",
          previousCategory: "Cierto",
          author: "Periodista 1",
          details: "Cambio de categoría tras revisión",
        },
      ];

      const trace = buildEditorialTraceExport({
        caseId: "a1",
        author: "Periodista 1",
        category: "Impreciso",
        justification: "Evidencia contrastada.",
        events,
        exportTimestamp: "2026-08-15T11:10:00.000Z",
      });

      expect(trace.exportType).toBe("informa-t.editorial-trace");
      expect(trace.caseId).toBe("a1");
      expect(trace.exportTimestamp).toBe("2026-08-15T11:10:00.000Z");
      expect(trace.currentDecision).toEqual({
        author: "Periodista 1",
        category: "Impreciso",
        justification: "Evidencia contrastada.",
        isExportReady: true,
      });
      expect(trace.events).toHaveLength(2);
      expect(trace.events[0].type).toBe("selected");
      expect(trace.events[1].type).toBe("changed");
    });

    it("marks isExportReady false if any field is missing", () => {
      const trace = buildEditorialTraceExport({
        caseId: "a1",
        author: "",
        category: "Impreciso",
        justification: "Evidencia contrastada.",
        events: [],
      });
      expect(trace.currentDecision.isExportReady).toBe(false);
    });
  });
});
