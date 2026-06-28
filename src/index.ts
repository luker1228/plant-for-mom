import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { log, httpLogger } from "./lib/logger/index.js";
import { agentRoutes } from "./routes/agent.js";
import { plantRoutes } from "./routes/plants.js";
import { observationRoutes } from "./routes/observations.js";
import { taskRoutes } from "./routes/tasks.js";

const app = new Hono();

app.use("*", httpLogger);
app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/agent", agentRoutes);
app.route("/api/plants", plantRoutes);
app.route("/api/observations", observationRoutes);
app.route("/api/tasks", taskRoutes);

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  log.info("server started", { port: info.port });
});

export { app };