import { Hono } from "hono";

import { demoRoutes } from "./server/routes/demo";

const app = new Hono();

app.route("/api/demo", demoRoutes);
app.notFound((context) => context.json({ error: "Ruta no encontrada" }, 404));

export default app;
