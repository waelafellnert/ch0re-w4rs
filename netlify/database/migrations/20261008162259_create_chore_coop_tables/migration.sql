CREATE TABLE "events" (
	"id" serial PRIMARY KEY,
	"mission_id" integer NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"role" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"room" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"max_players" integer NOT NULL,
	"status" text DEFAULT 'lobby' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"countdown_started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY,
	"token" text NOT NULL,
	"mission_id" integer NOT NULL,
	"nickname" text NOT NULL,
	"role" text NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"ready" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY,
	"mission_id" integer NOT NULL,
	"task_key" text NOT NULL,
	"role" text NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"order_index" integer NOT NULL,
	"depends_on_key" text,
	"done" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_mission_id_missions_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id");--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_mission_id_missions_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_mission_id_missions_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id");