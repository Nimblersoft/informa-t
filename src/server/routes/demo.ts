import { Hono } from "hono";

import a1Fixture from "../../fixtures/cases/a1.json";
import { parseDemoCase } from "../../shared/contracts";

const cases: Record<string, unknown> = { a1: a1Fixture };

export const demoRoutes = new Hono();

demoRoutes.get("/cases/:id", (context) => {
  const demoCase = cases[context.req.param("id")];

  if (demoCase === undefined) {
    return context.json({ error: "Caso de demostración no encontrado" }, 404);
  }

  return context.json(parseDemoCase(demoCase));
});
