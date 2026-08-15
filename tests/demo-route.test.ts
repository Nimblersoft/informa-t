import { describe, expect, it, vi } from "vitest";

import { parseDemoCase } from "../src/shared/contracts";
import app from "../src/worker";

describe("demo case route", () => {
  it("returns the schema-valid A1 synthetic case without external calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await app.request("http://local.test/api/demo/cases/a1");
    const payload = parseDemoCase(await response.json());

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ label: "Datos sintéticos de desarrollo" });
    expect(payload.proposals).toHaveLength(3);
    expect(payload.proposals).toEqual([
      expect.objectContaining({ placeholder: true, attributed: false }),
      expect.objectContaining({ placeholder: true, attributed: false }),
      expect.objectContaining({ placeholder: true, attributed: false }),
    ]);
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
});
