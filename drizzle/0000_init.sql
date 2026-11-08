CREATE TYPE "public"."training_day_type" AS ENUM('treino', 'descanso', 'acessorios', 'opcional');--> statement-breakpoint
CREATE TABLE "daily_weights" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"training_day_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"sets" smallint,
	"reps" text,
	"rest_seconds" smallint,
	"to_failure" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"weight_kg" numeric(5, 2),
	"waist_cm" numeric(5, 2),
	"chest_cm" numeric(5, 2),
	"shoulders_cm" numeric(5, 2),
	"arm_right_cm" numeric(5, 2),
	"arm_left_cm" numeric(5, 2),
	"thigh_cm" numeric(5, 2),
	"calf_cm" numeric(5, 2),
	"neck_cm" numeric(5, 2),
	"strength_dropping" boolean,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"effective_from" date NOT NULL,
	"calories" integer NOT NULL,
	"protein_g" integer NOT NULL,
	"carbs_g" integer NOT NULL,
	"fat_g" integer NOT NULL,
	"label" text NOT NULL,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"display_name" text NOT NULL,
	"sex" text NOT NULL,
	"birth_year" smallint,
	"height_cm" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"weekday" smallint NOT NULL,
	"title" text NOT NULL,
	"type" "training_day_type" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_training_day_id_training_days_id_fk" FOREIGN KEY ("training_day_id") REFERENCES "public"."training_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_weights_date_uq" ON "daily_weights" USING btree ("date");--> statement-breakpoint
CREATE INDEX "exercises_day_position_idx" ON "exercises" USING btree ("training_day_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "measurements_date_uq" ON "measurements" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_goals_effective_label_uq" ON "nutrition_goals" USING btree ("effective_from","label");--> statement-breakpoint
CREATE INDEX "nutrition_goals_effective_idx" ON "nutrition_goals" USING btree ("effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "training_days_weekday_uq" ON "training_days" USING btree ("weekday");