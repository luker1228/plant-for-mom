import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const taskRoutes = new Hono();

const createTaskSchema = z.object({
  plantId: z.string().uuid(),
  userId: z.string().min(1),
  type: z.enum(["watering", "fertilizing", "pruning", "repotting", "observation"]),
  title: z.string().optional(),
  dueDate: z.string().optional(),
  reason: z.string().optional(),
});

taskRoutes.get("/", async (c) => {
  const plantId = c.req.query("plantId");
  const status = c.req.query("status");

  const conditions = [];
  if (plantId) conditions.push(eq(schema.careTasks.plantId, plantId));
  if (status) conditions.push(eq(schema.careTasks.status, status as "pending" | "done" | "skipped"));

  const tasks = await db
    .select()
    .from(schema.careTasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return c.json(tasks);
});

taskRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const [task] = await db
    .insert(schema.careTasks)
    .values({
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    })
    .returning();
  return c.json(task, 201);
});

taskRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [task] = await db
    .update(schema.careTasks)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.careTasks.id, id))
    .returning();
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json(task);
});

taskRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(schema.careTasks).where(eq(schema.careTasks.id, id));
  return c.json({ success: true });
});

export { taskRoutes };