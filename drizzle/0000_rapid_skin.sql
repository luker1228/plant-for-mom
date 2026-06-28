CREATE TYPE "public"."care_task_status" AS ENUM('pending', 'done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."care_task_type" AS ENUM('watering', 'fertilizing', 'pruning', 'repotting', 'observation');--> statement-breakpoint
CREATE TYPE "public"."plant_lifecycle_status" AS ENUM('unknown_plant', 'identified', 'profile_created', 'care_plan_created', 'observing', 'need_action', 'follow_up_scheduled');--> statement-breakpoint
CREATE TABLE "care_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_task_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"plant_id" uuid NOT NULL,
	"action" varchar(128) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"type" "care_task_type" NOT NULL,
	"title" varchar(255),
	"due_date" timestamp with time zone,
	"status" "care_task_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"plant_id" uuid,
	"user_message" text NOT NULL,
	"agent_message" text,
	"tool_calls" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"image_urls" text[],
	"symptoms" text[],
	"user_note" text,
	"soil_moisture" varchar(64),
	"temperature" real,
	"humidity" real,
	"light_hours" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"species" varchar(255),
	"common_name" varchar(255),
	"location" varchar(255),
	"pot_type" varchar(128),
	"soil_type" varchar(128),
	"light_condition" varchar(128),
	"growth_stage" varchar(128),
	"lifecycle_status" "plant_lifecycle_status" DEFAULT 'unknown_plant' NOT NULL,
	"avatar_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(128) NOT NULL,
	"nickname" varchar(255),
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id")
);
