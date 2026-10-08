// Server-side game logic shared by the API routes.
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { events, missions, players, tasks } from "../../../db/schema.js";
import type {
  MissionStateView,
  MissionStatus,
  Role,
  RoomKey,
  TaskView,
} from "../gameTypes";
import { ROLE_META, ROOM_META } from "../gameTypes";

type MissionRow = typeof missions.$inferSelect;
type PlayerRow = typeof players.$inferSelect;
type TaskRow = typeof tasks.$inferSelect;

// Unambiguous letters only — easy to read out loud across the room.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 8);
}

export async function getMissionByCode(code: string): Promise<MissionRow | null> {
  const rows = await db
    .select()
    .from(missions)
    .where(eq(missions.code, normalizeCode(code)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAuthedPlayer(
  missionId: number,
  playerId: string,
  token: string,
): Promise<PlayerRow | null> {
  if (!playerId || !token) return null;
  const rows = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.missionId, missionId)))
    .limit(1);
  const player = rows[0];
  if (!player || player.token !== token) return null;
  return player;
}

export async function logEvent(
  missionId: number,
  type: string,
  message: string,
  role: Role | null = null,
) {
  await db.insert(events).values({ missionId, type, message, role });
}

/** Launch countdown is 3 seconds; the launch animation runs ~6 more. */
const COUNTDOWN_MS = 3200;
const LAUNCH_ANIM_MS = 6000;

/**
 * Lazily settle time-driven transitions (countdown -> complete) so no
 * background job is needed. Called from the state endpoint.
 */
async function settleMission(mission: MissionRow): Promise<MissionRow> {
  if (
    mission.status === "countdown" &&
    mission.countdownStartedAt &&
    Date.now() - mission.countdownStartedAt.getTime() > COUNTDOWN_MS + LAUNCH_ANIM_MS
  ) {
    const completedAt = new Date(
      mission.countdownStartedAt.getTime() + COUNTDOWN_MS + LAUNCH_ANIM_MS,
    );
    await db
      .update(missions)
      .set({ status: "complete", completedAt })
      .where(and(eq(missions.id, mission.id), eq(missions.status, "countdown")));
    return { ...mission, status: "complete", completedAt };
  }
  return mission;
}

function taskViews(taskRows: TaskRow[]): TaskView[] {
  const doneKeys = new Set(taskRows.filter((t) => t.done).map((t) => t.taskKey));
  const roleByKey = new Map(taskRows.map((t) => [t.taskKey, t.role as Role]));
  return taskRows
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id)
    .map((t) => {
      const blocked = !!t.dependsOnKey && !doneKeys.has(t.dependsOnKey);
      return {
        id: t.id,
        taskKey: t.taskKey,
        role: t.role as Role,
        title: t.title,
        detail: t.detail,
        orderIndex: t.orderIndex,
        dependsOnKey: t.dependsOnKey,
        done: t.done,
        available: !t.done && !blocked,
        blockedByRole:
          blocked && t.dependsOnKey ? (roleByKey.get(t.dependsOnKey) ?? null) : null,
      };
    });
}

const ONLINE_WINDOW_MS = 15000;

export async function buildStateView(
  missionInput: MissionRow,
): Promise<MissionStateView> {
  const mission = await settleMission(missionInput);

  const [playerRows, taskRows, eventRows] = await Promise.all([
    db
      .select()
      .from(players)
      .where(eq(players.missionId, mission.id))
      .orderBy(asc(players.joinedAt)),
    db.select().from(tasks).where(eq(tasks.missionId, mission.id)),
    db
      .select()
      .from(events)
      .where(eq(events.missionId, mission.id))
      .orderBy(desc(events.id))
      .limit(30),
  ]);

  const now = Date.now();
  const tv = taskViews(taskRows);

  return {
    serverNow: now,
    mission: {
      code: mission.code,
      room: mission.room as RoomKey,
      roomLabel: ROOM_META[mission.room as RoomKey]?.label ?? mission.room,
      durationMinutes: mission.durationMinutes,
      maxPlayers: mission.maxPlayers,
      status: mission.status as MissionStatus,
      startedAt: mission.startedAt?.getTime() ?? null,
      countdownStartedAt: mission.countdownStartedAt?.getTime() ?? null,
      completedAt: mission.completedAt?.getTime() ?? null,
    },
    players: playerRows.map((p) => {
      const mine = taskRows.filter((t) => t.role === p.role);
      return {
        id: p.id,
        nickname: p.nickname,
        role: p.role as Role,
        isHost: p.isHost,
        ready: p.ready,
        online: now - p.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
        tasksDone: mine.filter((t) => t.done).length,
        tasksTotal: mine.length,
      };
    }),
    tasks: tv,
    events: eventRows
      .slice()
      .reverse()
      .map((e) => ({
        id: e.id,
        type: e.type,
        message: e.message,
        role: (e.role as Role | null) ?? null,
      })),
  };
}

/** System milestone copy, used for live teammate notifications. */
export function systemMilestone(role: Role, fractionDone: number): string | null {
  const meta = ROLE_META[role];
  if (fractionDone >= 1) {
    return `${meta.system.toUpperCase()} FULLY ONLINE`;
  }
  switch (role) {
    case "clearer":
      return `Navigation restored to ${Math.round(fractionDone * 100)}%`;
    case "cleaner":
      return `Engine power increased to ${Math.round(fractionDone * 100)}%`;
    case "finisher":
      return `Shields charged to ${Math.round(fractionDone * 100)}%`;
  }
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
