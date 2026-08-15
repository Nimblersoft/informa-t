// # Spec: docs/specs/ai-search-provider.md

import { describe, expect, it, vi } from "vitest";

import { AiSearchProvider, type AiSearchInstance } from "../src/server/providers/ai-search";

function chunk(id: string, excerpt: string, title: string) {
  return {
    id,
    text: excerpt,
    metadata: {
      institution: "INEC",
      collection: "Estadísticas oficiales",
      title,
      version: "2025",
      sourceUrl: `https://example.test/${id}`,
      retrievalDate: "2026-08-15",
      citationLocation: "Tabla 1",
      license: "CC BY 4.0",
      coverageLimits: "Nacional",
      sha256: "a".repeat(64),
    },
  };
}

describe("jury-safe live analysis boundaries", () => {
  it("admits only evidence with conservative topical overlap", async () => {
    const search = vi.fn(async () => ({
      results: [
        chunk("unrelated", "Homicidios y seguridad nacional enero 2025.", "Boletín de seguridad"),
        chunk("relevant", "Pobreza por ingresos y resultados de junio de 2025.", "Boletín de pobreza por ingresos"),
      ],
    }));
    const provider = new AiSearchProvider({
      binding: { get: () => ({ items: { uploadAndPoll: vi.fn() }, search }) as AiSearchInstance },
    });

    const result = await provider.searchEvidence({ query: "pobreza por ingresos junio 2025" });

    expect(result.outcome).toBe("Evidencia encontrada");
    expect(result.excerpts.map((excerpt) => excerpt.id)).toEqual(["relevant"]);
    expect(result.limitations.join(" ")).toContain("relevancia insuficiente");
  });

  it("returns insufficient evidence when official results are unrelated", async () => {
    const provider = new AiSearchProvider({
      binding: { get: () => ({ items: { uploadAndPoll: vi.fn() }, search: async () => ({ results: [chunk("unrelated", "Homicidios y seguridad nacional enero 2025.", "Boletín de seguridad")] }) }) },
    });

    const result = await provider.searchEvidence({ query: "pobreza por ingresos junio 2025" });

    expect(result).toEqual(expect.objectContaining({ outcome: "Evidencia insuficiente", excerpts: [] }));
    expect(result.limitations.join(" ")).toContain("relevancia insuficiente");
  });

  it("admits a poverty source when the claim adds numeric context", async () => {
    const provider = new AiSearchProvider({
      binding: { get: () => ({ items: { uploadAndPoll: vi.fn() }, search: async () => ({ results: [chunk("poverty", "INEC: la pobreza por ingresos se ubicó en junio de 2025.", "Pobreza por Ingresos - Resultados Junio 2025")] }) }) },
    });

    const result = await provider.searchEvidence({ query: "Hemos bajado la pobreza al mejor punto desde 2018, con 24 puntos" });

    expect(result.outcome).toBe("Evidencia encontrada");
    expect(result.excerpts.map((excerpt) => excerpt.id)).toEqual(["poverty"]);
  });
});
