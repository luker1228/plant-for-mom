import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

export const plantLifecycleStatusEnum = pgEnum("plant_lifecycle_status", [
  "unknown_plant",
  "identified",
  "profile_created",
  "care_plan_created",
  "observing",
  "need_action",
  "follow_up_scheduled",
]);

export const careTaskStatusEnum = pgEnum("care_task_status", [
  "pending",
  "done",
  "skipped",
]);

export const careTaskTypeEnum = pgEnum("care_task_type", [
  "watering",
  "fertilizing",
  "pruning",
  "repotting",
  "observation",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const plantProfiles = pgTable("plant_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  species: varchar("species", { length: 255 }),
  commonName: varchar("common_name", { length: 255 }),
  location: varchar("location", { length: 255 }),
  potType: varchar("pot_type", { length: 128 }),
  soilType: varchar("soil_type", { length: 128 }),
  lightCondition: varchar("light_condition", { length: 128 }),
  growthStage: varchar("growth_stage", { length: 128 }),
  lifecycleStatus: plantLifecycleStatusEnum("lifecycle_status").default("unknown_plant").notNull(),
  avatarUrl: text("avatar_url"),
  notes: text("notes"),
  ...timestamps,
});

export const plantObservations = pgTable("plant_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantId: uuid("plant_id").notNull(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  imageUrls: text("image_urls").array(),
  symptoms: text("symptoms").array(),
  userNote: text("user_note"),
  soilMoisture: varchar("soil_moisture", { length: 64 }),
  temperature: real("temperature"),
  humidity: real("humidity"),
  lightHours: real("light_hours"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const careGuides = pgTable("care_guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantId: uuid("plant_id").notNull(),
  content: jsonb("content").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const careTasks = pgTable("care_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantId: uuid("plant_id").notNull(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  type: careTaskTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: careTaskStatusEnum("status").default("pending").notNull(),
  reason: text("reason"),
  ...timestamps,
});

export const careTaskLogs = pgTable("care_task_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull(),
  plantId: uuid("plant_id").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  plantId: uuid("plant_id"),
  userMessage: text("user_message").notNull(),
  agentMessage: text("agent_message"),
  toolCalls: jsonb("tool_calls"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});