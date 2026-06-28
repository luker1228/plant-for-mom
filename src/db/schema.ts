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
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: varchar("external_id", { length: 128 }).notNull().unique(),
  nickname: varchar("nickname", { length: 255 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  plants: many(plantProfiles),
  observations: many(plantObservations),
  careTasks: many(careTasks),
  conversations: many(conversations),
}));

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

export const plantProfilesRelations = relations(plantProfiles, ({ one, many }) => ({
  user: one(users, { fields: [plantProfiles.userId], references: [users.id] }),
  observations: many(plantObservations),
  careTasks: many(careTasks),
  careGuides: many(careGuides),
}));

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

export const plantObservationsRelations = relations(plantObservations, ({ one }) => ({
  user: one(users, { fields: [plantObservations.userId], references: [users.id] }),
  plant: one(plantProfiles, { fields: [plantObservations.plantId], references: [plantProfiles.id] }),
}));

export const careGuides = pgTable("care_guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantId: uuid("plant_id").notNull(),
  content: jsonb("content").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const careGuidesRelations = relations(careGuides, ({ one }) => ({
  plant: one(plantProfiles, { fields: [careGuides.plantId], references: [plantProfiles.id] }),
}));

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

export const careTasksRelations = relations(careTasks, ({ one, many }) => ({
  user: one(users, { fields: [careTasks.userId], references: [users.id] }),
  plant: one(plantProfiles, { fields: [careTasks.plantId], references: [plantProfiles.id] }),
  logs: many(careTaskLogs),
}));

export const careTaskLogs = pgTable("care_task_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull(),
  plantId: uuid("plant_id").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const careTaskLogsRelations = relations(careTaskLogs, ({ one }) => ({
  task: one(careTasks, { fields: [careTaskLogs.taskId], references: [careTasks.id] }),
  plant: one(plantProfiles, { fields: [careTaskLogs.plantId], references: [plantProfiles.id] }),
}));

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

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  plant: one(plantProfiles, { fields: [conversations.plantId], references: [plantProfiles.id] }),
}));