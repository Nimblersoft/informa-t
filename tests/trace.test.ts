import { describe, expect, it } from "vitest";

import { hashCanonicalJson, redactTrace } from "../src/shared/trace";

describe("canonical JSON hashing", () => {
  it("is stable across object key order and equivalent numbers", async () => {
    await expect(
      hashCanonicalJson({ b: [2.0, { z: 3.0, a: true }], a: 1.0 }),
    ).resolves.toBe(await hashCanonicalJson({ a: 1, b: [2, { a: true, z: 3 }] }));
  });
});

describe("trace redaction", () => {
  it("removes sensitive and chain-of-thought fields at every nesting level", () => {
    expect(
      redactTrace({
        event: "consulta",
        chainOfThought: "private",
        nested: {
          authorization: "Bearer secret",
          headers: { "x-api-key": "secret" },
          requestHeaders: { cookie: "private" },
          chain_of_thought: "private",
          provenance: "archivo oficial",
          deeper: {
            response_headers: { authorization: "secret" },
            sourceUrl: "https://example.test/fuente",
          },
        },
      }),
    ).toEqual({
      event: "consulta",
      nested: {
        provenance: "archivo oficial",
        deeper: { sourceUrl: "https://example.test/fuente" },
      },
    });
  });
});
