import { Hono } from "hono";

import { demoRoutes } from "./server/routes/demo";
import { analysisRoutes } from "./server/routes/analyses";
import { deleteExpired } from "./server/audit/claim-extraction-audit";

const app = new Hono<{ Bindings: Env }>();

app.route("/api/demo", demoRoutes);
app.route("/api", analysisRoutes);

app.notFound(async (context) => {
  if (context.env?.ASSETS) {
    return context.env.ASSETS.fetch(context.req.raw);
  }
  return context.json({ error: "Ruta no encontrada" }, 404);
});

async function scheduled(controller: ScheduledController, env: Env): Promise<void> {
  await deleteExpired(env.AUDIT_DB, controller.scheduledTime);
}

export { app };
export default { fetch: app.fetch, scheduled } satisfies ExportedHandler<Env>;
