import { Hono } from "hono";

import { demoRoutes } from "./server/routes/demo";

interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const app = new Hono<{ Bindings: Env }>();

app.route("/api/demo", demoRoutes);

app.notFound(async (context) => {
  if (context.env?.ASSETS) {
    return context.env.ASSETS.fetch(context.req.raw);
  }
  return context.json({ error: "Ruta no encontrada" }, 404);
});

export default app;
