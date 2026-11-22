CREATE TABLE "checkin_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"atypical" boolean DEFAULT false NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "checkin_weeks_week_uq" ON "checkin_weeks" USING btree ("week_start");