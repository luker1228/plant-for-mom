import { Hono } from "hono";
import { z } from "zod";
import { PlantAgent } from "../core/agent/PlantAgent.js";
import { log, withLogContext } from "../lib/logger/index.js";
import { openaiLLMClient } from "../core/llm/index.js";

const agentRoutes = new Hono();
const plantAgent = new PlantAgent(openaiLLMClient);

const messageSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  plantId: z.string().uuid().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  history: z.array(z.any()).optional(),
});

agentRoutes.post("/message", async (c) => {
  const body = await c.req.json();
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  try {
    const result = await withLogContext(
      { userId: parsed.data.userId, plantId: parsed.data.plantId },
      () => plantAgent.chat(parsed.data),
    );
    return c.json(result);
  } catch (err) {
    log.error(`agent message failed: ${(err as Error).message}`);
    return c.json({ error: "Agent processing failed" }, 500);
  }
});

agentRoutes.post("/identify", async (c) => {
  const identifySchema = z.object({
    imageUrls: z.array(z.string().url()),
    userDescription: z.string().optional(),
  });

  const body = await c.req.json();
  const parsed = identifySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const { identifyPlantTool } = await import("../tools/identifyPlantTool.js");
  const result = await identifyPlantTool.execute(
    {
      imageUrls: parsed.data.imageUrls,
      userDescription: parsed.data.userDescription,
    },
    { userId: c.req.header("x-user-id") ?? "anonymous" },
  );

  return c.json(result);
});

export { agentRoutes };