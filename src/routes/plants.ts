import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const plantRoutes = new Hono();

const createPlantSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  species: z.string().optional(),
  commonName: z.string().optional(),
  location: z.string().optional(),
  potType: z.string().optional(),
  soilType: z.string().optional(),
  lightCondition: z.string().optional(),
  growthStage: z.string().optional(),
  avatarUrl: z.string().optional(),
  notes: z.string().optional(),
});

plantRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }
  const plants = await db
    .select()
    .from(schema.plantProfiles)
    .where(eq(schema.plantProfiles.userId, userId));
  return c.json(plants);
});

plantRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [plant] = await db
    .select()
    .from(schema.plantProfiles)
    .where(eq(schema.plantProfiles.id, id));
  if (!plant) return c.json({ error: "Plant not found" }, 404);
  return c.json(plant);
});

plantRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createPlantSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const [plant] = await db
    .insert(schema.plantProfiles)
    .values({
      ...parsed.data,
      lifecycleStatus: "profile_created",
    })
    .returning();
  return c.json(plant, 201);
});

plantRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [plant] = await db
    .update(schema.plantProfiles)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.plantProfiles.id, id))
    .returning();
  if (!plant) return c.json({ error: "Plant not found" }, 404);
  return c.json(plant);
});

plantRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(schema.plantProfiles).where(eq(schema.plantProfiles.id, id));
  return c.json({ success: true });
});

export { plantRoutes };