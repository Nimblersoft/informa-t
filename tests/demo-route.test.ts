import { describe, expect, it, vi } from "vitest";

import { parseDemoCase } from "../src/shared/contracts";
import a1FixtureJson from "../src/fixtures/cases/a1.json";
import { app } from "../src/worker";

describe("demo case route and contract schema", () => {
  it("returns the schema-valid A1 synthetic case without external calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await app.request("http://local.test/api/demo/cases/a1");
    const payload = parseDemoCase(await response.json());

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      id: "a1",
      label: "Datos sintéticos de desarrollo",
    });
    expect(payload.proposals).toHaveLength(3);
    expect(payload.proposals).toEqual([
      expect.objectContaining({ placeholder: true, attributed: false }),
      expect.objectContaining({ placeholder: true, attributed: false }),
      expect.objectContaining({ placeholder: true, attributed: false }),
    ]);

    expect(payload.excerpts.length).toBeGreaterThan(0);
    for (const excerpt of payload.excerpts) {
      expect(typeof excerpt.id).toBe("string");
      expect(typeof excerpt.title).toBe("string");
      expect(typeof excerpt.quote).toBe("string");
      expect(typeof excerpt.speaker).toBe("string");
      expect(typeof excerpt.timestamp).toBe("string");
      expect(typeof excerpt.sourceType).toBe("string");
      expect(typeof excerpt.logEventId).toBe("string");
    }

    expect(payload.relatedContext.length).toBeGreaterThan(0);
    for (const ctx of payload.relatedContext) {
      expect(typeof ctx.id).toBe("string");
      expect(typeof ctx.title).toBe("string");
      expect(typeof ctx.description).toBe("string");
      expect(typeof ctx.reference).toBe("string");
    }

    expect(payload.indices.length).toBeGreaterThan(0);
    for (const idx of payload.indices) {
      expect(typeof idx.id).toBe("string");
      expect(typeof idx.name).toBe("string");
      expect(Number.isInteger(idx.value)).toBe(true);
      expect(idx.value).toBeGreaterThanOrEqual(0);
      expect(idx.value).toBeLessThanOrEqual(100);
      expect(idx.max).toBe(100);
      expect(typeof idx.rubric).toBe("string");
      expect(typeof idx.justification).toBe("string");
      expect(typeof idx.heuristicLabel).toBe("string");
      expect(typeof idx.logEventId).toBe("string");
    }

    expect(payload.traceEvents.length).toBeGreaterThan(0);
    for (const evt of payload.traceEvents) {
      expect(typeof evt.id).toBe("string");
      expect(["Ingesta", "Extracción", "Análisis", "Consenso"]).toContain(evt.stage);
      expect(typeof evt.timestamp).toBe("string");
      expect(typeof evt.title).toBe("string");
      expect(typeof evt.description).toBe("string");
      expect(typeof evt.canonicalHash).toBe("string");
      expect(typeof evt.status).toBe("string");
      expect(typeof evt.details).toBe("string");
    }

    expect(payload.citations.length).toBeGreaterThan(0);
    for (const cite of payload.citations) {
      expect(typeof cite.id).toBe("string");
      expect(typeof cite.title).toBe("string");
      expect(typeof cite.url).toBe("string");
      expect(typeof cite.publisher).toBe("string");
      expect(typeof cite.type).toBe("string");
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns 404 for an unknown case", async () => {
    const response = await app.request("http://local.test/api/demo/cases/unknown");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Caso de demostración no encontrado",
    });
  });

  describe("parseDemoCase schema validation", () => {
    it("successfully parses valid A1 fixture", () => {
      const parsed = parseDemoCase(a1FixtureJson);
      expect(parsed.id).toBe("a1");
      expect(parsed.label).toBe("Datos sintéticos de desarrollo");
    });

    it("rejects payload with extra top-level keys", () => {
      expect(() =>
        parseDemoCase({
          ...a1FixtureJson,
          unexpectedExtraKey: "invalid",
        }),
      ).toThrow(TypeError);
    });

    it("rejects payload missing required arrays", () => {
      const { excerpts: _, ...missingExcerpts } = a1FixtureJson;
      expect(() => parseDemoCase(missingExcerpts)).toThrow(TypeError);

      const { traceEvents: __, ...missingEvents } = a1FixtureJson;
      expect(() => parseDemoCase(missingEvents)).toThrow(TypeError);
    });

    it("rejects proposals with incorrect length or invalid attributes", () => {
      expect(() =>
        parseDemoCase({
          ...a1FixtureJson,
          proposals: [
            { placeholder: true, attributed: false, message: "1" },
            { placeholder: true, attributed: false, message: "2" },
          ],
        }),
      ).toThrow(TypeError);

      expect(() =>
        parseDemoCase({
          ...a1FixtureJson,
          proposals: [
            { placeholder: true, attributed: true, message: "1" }, // attributed must be false
            { placeholder: true, attributed: false, message: "2" },
            { placeholder: true, attributed: false, message: "3" },
          ],
        }),
      ).toThrow(TypeError);
    });

    it("rejects indices with values outside 0..100 or non-integer", () => {
      const invalidIndices = a1FixtureJson.indices.map((idx, i) =>
        i === 0 ? { ...idx, value: 105 } : idx,
      );
      expect(() =>
        parseDemoCase({
          ...a1FixtureJson,
          indices: invalidIndices,
        }),
      ).toThrow(TypeError);

      const floatIndices = a1FixtureJson.indices.map((idx, i) =>
        i === 0 ? { ...idx, value: 75.5 } : idx,
      );
      expect(() =>
        parseDemoCase({
          ...a1FixtureJson,
          indices: floatIndices,
        }),
      ).toThrow(TypeError);
    });

    it("rejects trace events with unpermitted stages", () => {
      const invalidEvents = a1FixtureJson.traceEvents.map((evt, i) =>
        i === 0 ? { ...evt, stage: "StageInvalido" } : evt,
      );
      expect(() =>
        parseDemoCase({
          ...a1FixtureJson,
          traceEvents: invalidEvents,
        }),
      ).toThrow(TypeError);
    });

    it("rejects nested objects with extra unexpected keys", () => {
      const invalidExcerpts = a1FixtureJson.excerpts.map((item, i) =>
        i === 0 ? { ...item, extraField: "not-allowed" } : item,
      );
      expect(() =>
        parseDemoCase({
          ...a1FixtureJson,
          excerpts: invalidExcerpts,
        }),
      ).toThrow(TypeError);
    });
  });
});
