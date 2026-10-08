// db/schema.ts
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

// A mission is one cooperative household reset session (one "room" of players).
export const missions = pgTable("missions", {
  id: serial().primaryKey(),
  code: text().notNull().unique(), // 4-letter join code, e.g. "KZXP"
  room: text().notNull(), // kitchen | living | bedroom | whole
  durationMinutes: integer("duration_minutes").notNull(), // room-specific preset, see ROOM_DURATIONS
  maxPlayers: integer("max_players").notNull(), // 2 | 3
  // lobby -> active -> ready (all tasks done) -> countdown -> complete
  status: text().notNull().default("lobby"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  countdownStartedAt: timestamp("countdown_started_at"),
  completedAt: timestamp("completed_at"),
});

export const players = pgTable("players", {
  id: text().primaryKey(), // public id (shown to teammates)
  token: text().notNull(), // secret, only known to the owning device
  missionId: integer("mission_id")
    .notNull()
    .references(() => missions.id),
  nickname: text().notNull(),
  role: text().notNull(), // clearer | cleaner | finisher
  isHost: boolean("is_host").notNull().default(false),
  ready: boolean().notNull().default(false), // holding the launch button
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial().primaryKey(),
  missionId: integer("mission_id")
    .notNull()
    .references(() => missions.id),
  taskKey: text("task_key").notNull(), // stable key within the mission, e.g. "clear-counter"
  role: text().notNull(), // which role this objective belongs to
  title: text().notNull(),
  detail: text().notNull(),
  orderIndex: integer("order_index").notNull(),
  dependsOnKey: text("depends_on_key"), // taskKey that must be done first (teamwork unlock)
  done: boolean().notNull().default(false),
  completedAt: timestamp("completed_at"),
});

// Live event feed: task completions, system milestones, joins, launch events.
export const events = pgTable("events", {
  id: serial().primaryKey(),
  missionId: integer("mission_id")
    .notNull()
    .references(() => missions.id),
  type: text().notNull(), // join | start | task | system | unlock | ready | countdown
  message: text().notNull(),
  role: text(), // role color to render the toast with
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
