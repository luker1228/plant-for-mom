import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createYoga } from "graphql-yoga";
import { config } from "./config.js";
import { log, httpLogger } from "./lib/logger/index.js";
import { agentRoutes } from "./routes/agent.js";
import { schema } from "./graphql/index.js";

const app = new Hono();

app.use("*", httpLogger);
app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  context: (ctx) => ({
    userId: ctx.request.headers.get("x-user-id") ?? "anonymous",
  }),
  logging: log,
});

app.all("/graphql", (c) => yoga.fetch(c.req.raw));

app.route("/api/agent", agentRoutes);

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  log.info("server started", { port: info.port, graphql: "/graphql" });
});

export { app };