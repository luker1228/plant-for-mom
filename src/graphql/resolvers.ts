import { builder } from "./builder.js";
import { db, schema } from "../db/index.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import {
  UserRef,
  PlantRef,
  ObservationRef,
  CareTaskRef,
  PlantLifecycleStatusRef,
  CareTaskStatusRef,
  CareTaskTypeRef,
} from "./types.js";

builder.queryType({
  fields: (t) => ({
    users: t.field({
      type: [UserRef],
      nullable: false,
      resolve: async () => db.select().from(schema.users),
    }),

    user: t.field({
      type: UserRef,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }) => {
        const [u] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, id));
        return u ?? null;
      },
    }),

    userByExternalId: t.field({
      type: UserRef,
      nullable: true,
      args: { externalId: t.arg.string({ required: true }) },
      resolve: async (_root, { externalId }) => {
        const [u] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.externalId, externalId));
        return u ?? null;
      },
    }),

    plants: t.field({
      type: [PlantRef],
      nullable: false,
      args: { userId: t.arg.id({ required: true }) },
      resolve: async (_root, { userId }) =>
        db
          .select()
          .from(schema.plantProfiles)
          .where(eq(schema.plantProfiles.userId, userId)),
    }),

    plant: t.field({
      type: PlantRef,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }) => {
        const [p] = await db
          .select()
          .from(schema.plantProfiles)
          .where(eq(schema.plantProfiles.id, id));
        return p ?? null;
      },
    }),

    observations: t.field({
      type: [ObservationRef],
      nullable: false,
      args: {
        plantId: t.arg.id({ required: true }),
        limit: t.arg.int({ required: false }),
      },
      resolve: async (_root, { plantId, limit }) => {
        const q = db
          .select()
          .from(schema.plantObservations)
          .where(eq(schema.plantObservations.plantId, plantId))
          .orderBy(desc(schema.plantObservations.date));
        return limit ? await q.limit(limit) : await q;
      },
    }),

    careTasks: t.field({
      type: [CareTaskRef],
      nullable: false,
      args: {
        plantId: t.arg.id({ required: true }),
        status: t.arg({ type: CareTaskStatusRef, required: false }),
      },
      resolve: async (_root, { plantId, status }) => {
        const conditions = [eq(schema.careTasks.plantId, plantId)];
        if (status) conditions.push(eq(schema.careTasks.status, status));
        return db
          .select()
          .from(schema.careTasks)
          .where(and(...conditions));
      },
    }),
  }),
});

const createUserSchema = z.object({
  externalId: z.string().min(1),
  nickname: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

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

const addObservationSchema = z.object({
  plantId: z.string().uuid(),
  userId: z.string().min(1),
  date: z.date(),
  imageUrls: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  userNote: z.string().optional(),
  soilMoisture: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  lightHours: z.number().optional(),
});

const createCareTaskSchema = z.object({
  plantId: z.string().uuid(),
  userId: z.string().min(1),
  type: z.enum(["watering", "fertilizing", "pruning", "repotting", "observation"]),
  title: z.string().optional(),
  dueDate: z.date().nullable().optional(),
  reason: z.string().optional(),
});

builder.mutationType({
  fields: (t) => ({
    createUser: t.field({
      type: UserRef,
      nullable: false,
      args: {
        externalId: t.arg.string({ required: true }),
        nickname: t.arg.string({ required: false }),
        avatarUrl: t.arg.string({ required: false }),
      },
      resolve: async (_root, args) => {
        const parsed = createUserSchema.safeParse(args);
        if (!parsed.success) throw new Error(JSON.stringify(parsed.error.format()));
        const [u] = await db
          .insert(schema.users)
          .values(parsed.data)
          .returning();
        return u;
      },
    }),

    createPlant: t.field({
      type: PlantRef,
      nullable: false,
      args: {
        userId: t.arg.id({ required: true }),
        name: t.arg.string({ required: true }),
        species: t.arg.string({ required: false }),
        commonName: t.arg.string({ required: false }),
        location: t.arg.string({ required: false }),
        potType: t.arg.string({ required: false }),
        soilType: t.arg.string({ required: false }),
        lightCondition: t.arg.string({ required: false }),
        growthStage: t.arg.string({ required: false }),
        avatarUrl: t.arg.string({ required: false }),
        notes: t.arg.string({ required: false }),
      },
      resolve: async (_root, args) => {
        const parsed = createPlantSchema.safeParse(args);
        if (!parsed.success) throw new Error(JSON.stringify(parsed.error.format()));
        const [p] = await db
          .insert(schema.plantProfiles)
          .values({
            ...parsed.data,
            lifecycleStatus: "profile_created",
          })
          .returning();
        return p;
      },
    }),

    updatePlant: t.field({
      type: PlantRef,
      nullable: true,
      args: {
        id: t.arg.id({ required: true }),
        name: t.arg.string({ required: false }),
        location: t.arg.string({ required: false }),
        notes: t.arg.string({ required: false }),
        lifecycleStatus: t.arg({ type: PlantLifecycleStatusRef, required: false }),
        avatarUrl: t.arg.string({ required: false }),
      },
      resolve: async (_root, { id, lifecycleStatus, ...rest }) => {
        const set: Record<string, unknown> = { updatedAt: new Date() };
        for (const [k, v] of Object.entries(rest)) if (v != null) set[k] = v;
        if (lifecycleStatus) set.lifecycleStatus = lifecycleStatus;
        const [p] = await db
          .update(schema.plantProfiles)
          .set(set)
          .where(eq(schema.plantProfiles.id, id))
          .returning();
        return p ?? null;
      },
    }),

    deletePlant: t.boolean({
      nullable: false,
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }) => {
        await db.delete(schema.plantProfiles).where(eq(schema.plantProfiles.id, id));
        return true;
      },
    }),

    addObservation: t.field({
      type: ObservationRef,
      nullable: false,
      args: {
        plantId: t.arg.id({ required: true }),
        userId: t.arg.id({ required: true }),
        date: t.arg({ type: "DateTime", required: true }),
        imageUrls: t.arg.stringList({ required: false }),
        symptoms: t.arg.stringList({ required: false }),
        userNote: t.arg.string({ required: false }),
        soilMoisture: t.arg.string({ required: false }),
        temperature: t.arg.float({ required: false }),
        humidity: t.arg.float({ required: false }),
        lightHours: t.arg.float({ required: false }),
      },
      resolve: async (_root, args) => {
        const parsed = addObservationSchema.safeParse({
          ...args,
          plantId: args.plantId,
          userId: args.userId,
        });
        if (!parsed.success) throw new Error(JSON.stringify(parsed.error.format()));
        const [o] = await db
          .insert(schema.plantObservations)
          .values(parsed.data)
          .returning();
        return o;
      },
    }),

    createCareTask: t.field({
      type: CareTaskRef,
      nullable: false,
      args: {
        plantId: t.arg.id({ required: true }),
        userId: t.arg.id({ required: true }),
        type: t.arg({ type: CareTaskTypeRef, required: true }),
        title: t.arg.string({ required: false }),
        dueDate: t.arg({ type: "DateTime", required: false }),
        reason: t.arg.string({ required: false }),
      },
      resolve: async (_root, args) => {
        const parsed = createCareTaskSchema.safeParse(args);
        if (!parsed.success) throw new Error(JSON.stringify(parsed.error.format()));
        const [task] = await db
          .insert(schema.careTasks)
          .values({
            plantId: parsed.data.plantId,
            userId: parsed.data.userId,
            type: parsed.data.type,
            title: parsed.data.title,
            reason: parsed.data.reason,
            dueDate: parsed.data.dueDate ?? null,
          })
          .returning();
        return task;
      },
    }),

    updateCareTaskStatus: t.field({
      type: CareTaskRef,
      nullable: true,
      args: {
        id: t.arg.id({ required: true }),
        status: t.arg({ type: CareTaskStatusRef, required: true }),
        note: t.arg.string({ required: false }),
      },
      resolve: async (_root, { id, status, note }) => {
        const [task] = await db
          .update(schema.careTasks)
          .set({ status, updatedAt: new Date() })
          .where(eq(schema.careTasks.id, id))
          .returning();
        if (!task) return null;
        await db.insert(schema.careTaskLogs).values({
          taskId: task.id,
          plantId: task.plantId,
          action: status,
          note: note ?? null,
        });
        return task;
      },
    }),

    deleteCareTask: t.boolean({
      nullable: false,
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }) => {
        await db.delete(schema.careTasks).where(eq(schema.careTasks.id, id));
        return true;
      },
    }),
  }),
});