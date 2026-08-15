// # Spec: docs/specs/ai-search-provider.md

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  AiSearchProvider,
  createAiSearchProvider,
  OFFICIAL_AI_SEARCH_INSTANCE,
  type AiSearchChunk,
  type AiSearchInstance,
  type AiSearchInstanceItems,
  type AiSearchNamespaceBinding,
  type AiSearchResponse,
} from "../src/server/providers/ai-search";
import { seedAiSearch } from "../scripts/seed-ai-search";
import { isEvidenceExcerpt, isTraceEvent, type TraceEvent } from "../src/shared/contracts";

interface FakeStoredDocument {
  name: string;
  text: string;
  metadata: Record<string, unknown>;
  version: number;
}

class FakeAiSearchInstance implements AiSearchInstance {
  readonly documents = new Map<string, FakeStoredDocument>();
  lastSearchOptions?: {
    messages?: Array<{ role: string; content: string }>;
    query?: string;
    ai_search_options?: Record<string, unknown>;
  };
  mockSearchResults?: AiSearchChunk[];
  throwOnSearch = false;
  throwOnUpload = false;

  items: AiSearchInstanceItems = {
    uploadAndPoll: async (name: string, content: any, options?: any) => {
      if (this.throwOnUpload) {
        throw new Error("Simulated upload failure");
      }
      const existing = this.documents.get(name);
      const text = typeof content === "string" ? content : content?.text ?? "";
      const metadata = options?.metadata ?? content?.metadata ?? {};

      this.documents.set(name, {
        name,
        text,
        metadata,
        version: existing ? existing.version + 1 : 1,
      });

      return { status: "ready", name };
    },
  };

  search = async (options: {
    messages?: Array<{ role: string; content: string }>;
    query?: string;
    ai_search_options?: Record<string, unknown>;
  }): Promise<AiSearchResponse> => {
    this.lastSearchOptions = options;
    if (this.throwOnSearch) {
      throw new Error("Simulated search error");
    }

    if (this.mockSearchResults !== undefined) {
      return { chunks: this.mockSearchResults };
    }

    const filterOptions = (options.ai_search_options?.filters as Record<string, string>) ?? {};

    const matchingChunks: AiSearchChunk[] = [];
    for (const doc of this.documents.values()) {
      if (filterOptions.institution && doc.metadata.institution !== filterOptions.institution) {
        continue;
      }
      if (filterOptions.collection && doc.metadata.collection !== filterOptions.collection) {
        continue;
      }
      if (filterOptions.period && doc.metadata.period !== filterOptions.period) {
        continue;
      }
      if (filterOptions.type && doc.metadata.type !== filterOptions.type) {
        continue;
      }

      matchingChunks.push({
        id: doc.name,
        text: doc.text,
        score: 0.98,
        item: {
          key: doc.name,
          metadata: doc.metadata,
        },
      });
    }

    return { chunks: matchingChunks };
  };
}

class FakeAiSearchNamespaceBinding implements AiSearchNamespaceBinding {
  readonly instances = new Map<string, FakeAiSearchInstance>();

  get(instanceName: string): FakeAiSearchInstance {
    if (!this.instances.has(instanceName)) {
      this.instances.set(instanceName, new FakeAiSearchInstance());
    }
    return this.instances.get(instanceName)!;
  }
}

describe("Official AI Search Provider & Idempotent Seeder", () => {
  const repoRoot = path.resolve(__dirname, "..");

  describe("1. Idempotent Corpus Seeding", () => {
    it("seeds all manifest items with stable IDs and complete metadata", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const emittedTraces: TraceEvent[] = [];

      const report = await seedAiSearch({
        repoRoot,
        binding,
        traceSink: (event) => emittedTraces.push(event),
      });

      expect(report.success).toBe(true);
      expect(report.errors).toEqual([]);
      expect(report.indexedCount).toBe(2);
      expect(report.itemIds).toEqual(["inec-pobreza-2025-06", "inec-pobreza-historica-series"]);

      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);
      expect(instance.documents.size).toBe(2);
      expect(instance.documents.has("inec-pobreza-2025-06")).toBe(true);
      expect(instance.documents.has("inec-pobreza-historica-series")).toBe(true);

      const doc1 = instance.documents.get("inec-pobreza-2025-06")!;
      expect(doc1.metadata.institution).toBe("Instituto Nacional de Estadística y Censos (INEC)");
      expect(doc1.metadata.collection).toBe("Pobreza por Ingresos — ENEMDU");
      expect(doc1.metadata.sourceUrl).toContain("ecuadorencifras.gob.ec");
      expect(doc1.metadata.sha256).toBe("3baa0a7d736de26460c77670e36e9e3b4ed58219734eaebfd1e169c245f2a807");
      expect(doc1.text).toContain("Pobreza por Ingresos – Resultados Junio 2025");

      // Verify emitted traces
      expect(emittedTraces.length).toBe(2);
      for (const trace of emittedTraces) {
        expect(isTraceEvent(trace)).toBe(true);
        expect(trace.stage).toBe("Ingesta");
        expect(trace.status).toBe("Completado");
      }
    });

    it("proves explicit idempotence: re-seeding same input converges with zero duplicate documents", async () => {
      const binding = new FakeAiSearchNamespaceBinding();

      // First seeding run
      const report1 = await seedAiSearch({ repoRoot, binding });
      expect(report1.success).toBe(true);
      expect(report1.indexedCount).toBe(2);

      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);
      expect(instance.documents.size).toBe(2);
      const doc1Initial = instance.documents.get("inec-pobreza-2025-06")!;
      expect(doc1Initial.version).toBe(1);

      // Second seeding run with identical manifest
      const report2 = await seedAiSearch({ repoRoot, binding });
      expect(report2.success).toBe(true);
      expect(report2.indexedCount).toBe(2);

      // Total document count remains strictly 2 (no duplicate items added)
      expect(instance.documents.size).toBe(2);
      expect(Array.from(instance.documents.keys()).sort()).toEqual([
        "inec-pobreza-2025-06",
        "inec-pobreza-historica-series",
      ]);

      // Version incremented showing in-place upsert/overwrite
      const doc1Second = instance.documents.get("inec-pobreza-2025-06")!;
      expect(doc1Second.version).toBe(2);
    });
  });

  describe("2. Provider Configuration & Filter Forwarding", () => {
    it("always accesses informa-t-oficial instance through AI_SEARCH.get", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const provider = createAiSearchProvider({ binding });

      expect(provider.getInstance()).toBe(binding.get("informa-t-oficial"));
    });

    it("forwards only supplied filters (institution, collection, period, type) to ai_search_options", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);
      instance.mockSearchResults = [];

      const provider = new AiSearchProvider({ binding });

      await provider.searchEvidence({
        query: "tasa de pobreza junio 2025",
        filters: {
          institution: "Instituto Nacional de Estadística y Censos (INEC)",
          collection: "Pobreza por Ingresos — ENEMDU",
          period: "Junio 2025",
          type: "Documento Oficial",
        },
      });

      expect(instance.lastSearchOptions).toBeDefined();
      expect(instance.lastSearchOptions?.messages).toEqual([
        { role: "user", content: "tasa de pobreza junio 2025" },
      ]);
      expect(instance.lastSearchOptions?.ai_search_options?.filters).toEqual({
        institution: "Instituto Nacional de Estadística y Censos (INEC)",
        collection: "Pobreza por Ingresos — ENEMDU",
        period: "Junio 2025",
        type: "Documento Oficial",
      });
    });

    it("omits empty or undefined filters from ai_search_options.filters", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);
      instance.mockSearchResults = [];

      const provider = new AiSearchProvider({ binding });

      await provider.searchEvidence({
        query: "estadísticas de pobreza",
        filters: {
          institution: "INEC",
          collection: "   ", // whitespace only, should be omitted
          period: undefined,
        },
      });

      expect(instance.lastSearchOptions?.ai_search_options?.filters).toEqual({
        institution: "INEC",
      });
    });
  });

  describe("3. Fragment Capping (Defensive Maximum of 5)", () => {
    it("defensively caps retrieved fragments to at most five even if search service returns more", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);

      // Return 8 mock chunks
      instance.mockSearchResults = Array.from({ length: 8 }, (_, i) => ({
        id: `chunk-${i}`,
        text: `Verbatim text excerpt ${i}`,
        score: 0.9 - i * 0.05,
        metadata: {
          id: `chunk-${i}`,
          institution: "INEC",
          collection: "ENEMDU",
          title: `Boletín Técnico ${i}`,
          version: "2025",
          sourceUrl: `https://www.ecuadorencifras.gob.ec/doc-${i}`,
          retrievalDate: "2026-08-15",
          citationLocation: `Página ${i + 1}`,
          license: "CC BY 4.0",
          coverageLimits: "Indicadores nacionales",
          sha256: "3baa0a7d736de26460c77670e36e9e3b4ed58219734eaebfd1e169c245f2a807",
          excerpt: `Verbatim text excerpt ${i}`,
        },
      }));

      const provider = new AiSearchProvider({ binding });
      const result = await provider.searchEvidence({
        query: "pobreza por ingresos",
        maxResults: 10, // Requesting 10
      });

      expect(instance.lastSearchOptions?.ai_search_options?.max_num_results).toBe(5);
      expect(result.excerpts.length).toBe(5);
      expect(result.outcome).toBe("Evidencia encontrada");
      expect(result.excerpts.map((e) => e.id)).toEqual([
        "chunk-0",
        "chunk-1",
        "chunk-2",
        "chunk-3",
        "chunk-4",
      ]);
    });
  });

  describe("4. Full EvidenceExcerpt Mapping", () => {
    it("completely maps every EvidenceExcerpt field from chunk content and metadata without inventing provenance", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);

      instance.mockSearchResults = [
        {
          id: "inec-pobreza-2025-06",
          text: "El Instituto Nacional de Estadística y Censos (INEC) presenta los resultados...",
          score: 0.96,
          item: {
            key: "inec-pobreza-2025-06",
            metadata: {
              id: "inec-pobreza-2025-06",
              institution: "Instituto Nacional de Estadística y Censos (INEC)",
              collection: "Pobreza por Ingresos — ENEMDU",
              title: "Pobreza por Ingresos – Resultados Junio 2025",
              version: "Junio 2025",
              sourceUrl: "https://www.ecuadorencifras.gob.ec/pobreza-por-ingresos-resultados-2025/",
              retrievalDate: "2026-08-15",
              citationLocation: "Resultados principales Junio 2025 / Sección Pobreza Nacional",
              license: "CC BY 4.0",
              coverageLimits: "Cubre los indicadores agregados de pobreza por ingresos a nivel nacional...",
              sha256: "3baa0a7d736de26460c77670e36e9e3b4ed58219734eaebfd1e169c245f2a807",
              excerpt: "El Instituto Nacional de Estadística y Censos (INEC) presenta los resultados...",
              period: "Junio 2025",
              type: "Documento Oficial",
            },
          },
        },
      ];

      const provider = new AiSearchProvider({ binding });
      const result = await provider.searchEvidence({ query: "pobreza junio 2025" });

      expect(result.outcome).toBe("Evidencia encontrada");
      expect(result.excerpts.length).toBe(1);

      const excerpt = result.excerpts[0];
      expect(isEvidenceExcerpt(excerpt)).toBe(true);
      expect(excerpt).toEqual({
        id: "inec-pobreza-2025-06",
        institution: "Instituto Nacional de Estadística y Censos (INEC)",
        collection: "Pobreza por Ingresos — ENEMDU",
        title: "Pobreza por Ingresos – Resultados Junio 2025",
        version: "Junio 2025",
        sourceUrl: "https://www.ecuadorencifras.gob.ec/pobreza-por-ingresos-resultados-2025/",
        retrievalDate: "2026-08-15",
        citationLocation: "Resultados principales Junio 2025 / Sección Pobreza Nacional",
        license: "CC BY 4.0",
        coverageLimits: "Cubre los indicadores agregados de pobreza por ingresos a nivel nacional...",
        sha256: "3baa0a7d736de26460c77670e36e9e3b4ed58219734eaebfd1e169c245f2a807",
        excerpt: "El Instituto Nacional de Estadística y Censos (INEC) presenta los resultados...",
        period: "Junio 2025",
        type: "Documento Oficial",
        score: 0.96,
      });
    });
  });

  describe("5. Insufficient Evidence and Non-Verdict Degradation", () => {
    it("returns exact 'Evidencia insuficiente' and adds a trace limitation when no results exist", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);
      instance.mockSearchResults = []; // Empty results

      const traces: TraceEvent[] = [];
      const provider = new AiSearchProvider({
        binding,
        traceSink: (event) => traces.push(event),
      });

      const result = await provider.searchEvidence({
        query: "antecedentes penales de víctimas de homicidio",
      });

      expect(result.outcome).toBe("Evidencia insuficiente");
      expect(result.excerpts).toEqual([]);
      expect(result.limitations.length).toBeGreaterThan(0);
      expect(result.limitations[0]).toContain("No se encontraron fragmentos de evidencia oficial");

      // Verify verdict non-inference: never returns Falso or another editorial verdict
      expect(result.outcome).not.toBe("Falso");
      expect(result.outcome).not.toBe("Cierto");
      expect(result.outcome).not.toBe("Impreciso");

      expect(traces.length).toBe(1);
      expect(traces[0].stage).toBe("Extracción");
      expect(traces[0].status).toBe("Evidencia insuficiente");
      expect(traces[0].details).toContain("Evidencia insuficiente");
    });

    it("returns exact 'Evidencia insuficiente' and records limitation when returned chunk has missing required metadata", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);

      // Incomplete chunk: missing sourceUrl, citationLocation, and sha256
      instance.mockSearchResults = [
        {
          id: "incomplete-chunk",
          text: "Fragmento sin procedencia verificable",
          metadata: {
            id: "incomplete-chunk",
            institution: "INEC",
            collection: "ENEMDU",
            title: "Título de prueba",
            version: "2025",
            // sourceUrl missing
            retrievalDate: "2026-08-15",
            // citationLocation missing
            license: "CC BY 4.0",
            coverageLimits: "Límites",
            // sha256 missing
          },
        },
      ];

      const traces: TraceEvent[] = [];
      const provider = new AiSearchProvider({
        binding,
        traceSink: (event) => traces.push(event),
      });

      const result = await provider.searchEvidence({ query: "prueba de metadatos incompletos" });

      expect(result.outcome).toBe("Evidencia insuficiente");
      expect(result.excerpts).toEqual([]);
      expect(result.limitations.some((lim) => lim.includes("sourceUrl") && lim.includes("citationLocation"))).toBe(true);

      // Verify trace record
      expect(traces.length).toBe(1);
      expect(traces[0].status).toBe("Evidencia insuficiente");
      expect(traces[0].details).toContain("sourceUrl");
    });

    it("handles underlying search exceptions gracefully with 'Evidencia insuficiente'", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const instance = binding.get(OFFICIAL_AI_SEARCH_INSTANCE);
      instance.throwOnSearch = true;

      const provider = new AiSearchProvider({ binding });
      const result = await provider.searchEvidence({ query: "consulta con fallo" });

      expect(result.outcome).toBe("Evidencia insuficiente");
      expect(result.excerpts).toEqual([]);
      expect(result.limitations[0]).toContain("Error al consultar el servicio AI Search");
    });
  });

  describe("6. Trace Event Safety and Credential-Free Guarantees", () => {
    it("ensures all emitted traces adhere to TraceEvent schema and contain no credential-like values", async () => {
      const binding = new FakeAiSearchNamespaceBinding();
      const traces: TraceEvent[] = [];

      // Seed
      await seedAiSearch({ repoRoot, binding, traceSink: (t) => traces.push(t) });

      // Query
      const provider = new AiSearchProvider({ binding, traceSink: (t) => traces.push(t) });
      await provider.searchEvidence({ query: "pobreza" });

      expect(traces.length).toBeGreaterThanOrEqual(3);

      const sensitiveKeywords = [
        "token",
        "secret",
        "authorization",
        "apikey",
        "privatekey",
        "bearer",
        "password",
        "chainofthought",
      ];

      for (const trace of traces) {
        expect(isTraceEvent(trace)).toBe(true);
        expect(["Ingesta", "Extracción"]).toContain(trace.stage);

        const detailsLower = trace.details.toLowerCase();
        for (const kw of sensitiveKeywords) {
          expect(
            detailsLower.includes(`"${kw}"`),
            `Trace details must not contain sensitive key: ${kw}`,
          ).toBe(false);
        }
      }
    });

    it("verifies source files contain no real Cloudflare API credentials or tokens", () => {
      const filesToCheck = [
        path.join(repoRoot, "src", "server", "providers", "ai-search.ts"),
        path.join(repoRoot, "scripts", "seed-ai-search.ts"),
        path.join(repoRoot, "docs", "specs", "ai-search-provider.md"),
      ];

      const tokenPatterns = [
        /CLOUDFLARE_API_KEY/i,
        /CLOUDFLARE_API_TOKEN/i,
        /Bearer\s+[A-Za-z0-9_-]{20,}/i,
        /AI_SEARCH_API_KEY/i,
      ];

      for (const file of filesToCheck) {
        const content = fs.readFileSync(file, "utf-8");
        for (const pattern of tokenPatterns) {
          expect(
            pattern.test(content),
            `File ${path.relative(repoRoot, file)} must not match token pattern ${pattern}`,
          ).toBe(false);
        }
      }
    });
  });
});
