import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const observationRoutes = new Hono();

const createObservationSchema = z.object({
  plantId: z.string().uuid(),
  userId: z.string().min(1),
  date: z.string(),
  imageUrls: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  userNote: z.string().optional(),
  soilMoisture: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  lightHours: z.number().optional(),
});

observationRoutes.get("/", async (c) => {
  const plantId = c.req.query("plantId");
  if (!plantId) return c.json({ error: "plantId is required" }, 400);

  const observations = await db
    .select()
    .from(schema.plantObservations)
    .where(eq(schema.plantObservations.plantId, plantId))
    .orderBy(desc(schema.plantObservations.date));
  return c.json(observations);
});

observationRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createObservationSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const [obs] = await db
    .insert(schema.plantObservations)
    .values({
      ...parsed.data,
      date: new Date(parsed.data.date),
    })
    .returning();
  return c.json(obs, 201);
});

export { observationRoutes };