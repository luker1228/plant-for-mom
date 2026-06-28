import { builder } from "./builder.js";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

export const PlantLifecycleStatusRef = builder.enumType("PlantLifecycleStatus", {
  values: [
    "unknown_plant",
    "identified",
    "profile_created",
    "care_plan_created",
    "observing",
    "need_action",
    "follow_up_scheduled",
  ],
});

export const CareTaskStatusRef = builder.enumType("CareTaskStatus", {
  values: ["pending", "done", "skipped"],
});

export const CareTaskTypeRef = builder.enumType("CareTaskType", {
  values: ["watering", "fertilizing", "pruning", "repotting", "observation"],
});

type User = typeof schema.users.$inferSelect;
type Plant = typeof schema.plantProfiles.$inferSelect;
type Observation = typeof schema.plantObservations.$inferSelect;
type CareTask = typeof schema.careTasks.$inferSelect;
type CareTaskLog = typeof schema.careTaskLogs.$inferSelect;

export const PlantRef = builder.objectRef<Plant>("Plant").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    userId: t.exposeString("userId", { nullable: false }),
    name: t.exposeString("name", { nullable: false }),
    species: t.exposeString("species", { nullable: true }),
    commonName: t.exposeString("commonName", { nullable: true }),
    location: t.exposeString("location", { nullable: true }),
    potType: t.exposeString("potType", { nullable: true }),
    soilType: t.exposeString("soilType", { nullable: true }),
    lightCondition: t.exposeString("lightCondition", { nullable: true }),
    growthStage: t.exposeString("growthStage", { nullable: true }),
    lifecycleStatus: t.exposeString("lifecycleStatus", { nullable: false }),
    avatarUrl: t.exposeString("avatarUrl", { nullable: true }),
    notes: t.exposeString("notes", { nullable: true }),
    createdAt: t.field({
      type: "DateTime",
      nullable: false,
      resolve: (p) => p.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      nullable: false,
      resolve: (p) => p.updatedAt,
    }),
    observations: t.field({
      type: [ObservationRef],
      nullable: false,
      resolve: async (p) =>
        db
          .select()
          .from(schema.plantObservations)
          .where(eq(schema.plantObservations.plantId, p.id)),
    }),
    careTasks: t.field({
      type: [CareTaskRef],
      nullable: false,
      resolve: async (p) =>
        db
          .select()
          .from(schema.careTasks)
          .where(eq(schema.careTasks.plantId, p.id)),
    }),
  }),
});

export const ObservationRef = builder.objectRef<Observation>("Observation").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    plantId: t.exposeID("plantId"),
    userId: t.exposeString("userId", { nullable: false }),
    date: t.field({
      type: "DateTime",
      nullable: false,
      resolve: (o) => o.date,
    }),
    imageUrls: t.exposeStringList("imageUrls", { nullable: true }),
    symptoms: t.exposeStringList("symptoms", { nullable: true }),
    userNote: t.exposeString("userNote", { nullable: true }),
    soilMoisture: t.exposeString("soilMoisture", { nullable: true }),
    temperature: t.exposeFloat("temperature", { nullable: true }),
    humidity: t.exposeFloat("humidity", { nullable: true }),
    lightHours: t.exposeFloat("lightHours", { nullable: true }),
    createdAt: t.field({
      type: "DateTime",
      nullable: false,
      resolve: (o) => o.createdAt,
    }),
  }),
});

export const CareTaskRef = builder.objectRef<CareTask>("CareTask").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    plantId: t.exposeID("plantId"),
    userId: t.exposeString("userId", { nullable: false }),
    type: t.exposeString("type", { nullable: false }),
    title: t.exposeString("title", { nullable: true }),
    dueDate: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (task) => task.dueDate,
    }),
    status: t.exposeString("status", { nullable: false }),
    reason: t.exposeString("reason", { nullable: true }),
    createdAt: t.field({
      type: "DateTime",
      nullable: false,
      resolve: (task) => task.createdAt,
    }),
    updatedAt: t.field({
      type: "DateTime",
      nullable: false,
      resolve: (task) => task.updatedAt,
    }),
    logs: t.field({
      type: [CareTaskLogRef],
      nullable: false,
      resolve: async (task) =>
        db
          .select()
          .from(schema.careTaskLogs)
          .where(eq(schema.careTaskLogs.taskId, task.id)),
    }),
  }),
});

export const CareTaskLogRef = builder.objectRef<CareTaskLog>("CareTaskLog").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    taskId: t.exposeID("taskId"),
    plantId: t.exposeID("plantId"),
    action: t.exposeString("action", { nullable: false }),
    note: t.exposeString("note", { nullable: true }),
    createdAt: t.field({
      type: "DateTime",
      nullable: false,
      resolve: (log) => log.createdAt,
    }),
  }),
});

export const UserRef = builder.objectRef<User>("User").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    externalId: t.exposeString("externalId", { nullable: false }),
    nickname: t.exposeString("nickname", { nullable: true }),
    avatarUrl: t.exposeString("avatarUrl", { nullable: true }),
    createdAt: t.field({
      type: "DateTime",
      nullable: false,
      resolve: (u) => u.createdAt,
    }),
    plants: t.field({
      type: [PlantRef],
      nullable: false,
      resolve: async (u) =>
        db
          .select()
          .from(schema.plantProfiles)
          .where(eq(schema.plantProfiles.userId, u.id)),
    }),
  }),
});