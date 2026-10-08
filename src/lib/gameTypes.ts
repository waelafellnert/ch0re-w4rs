// Shared types between server routes and client UI.

export type Role = "clearer" | "cleaner" | "finisher";

export type RoomKey = "kitchen" | "living" | "bedroom" | "whole";

export type MissionStatus =
  | "lobby"
  | "active"
  | "ready"
  | "countdown"
  | "complete";

export const ROOM_META: Record<RoomKey, { label: string; blurb: string }> = {
  kitchen: { label: "Kitchen", blurb: "Counters, sink and table reset" },
  living: { label: "Living Room", blurb: "Sofa, surfaces and floor reset" },
  bedroom: { label: "Bedroom", blurb: "Bed, clothes and surfaces reset" },
  whole: { label: "Whole House", blurb: "A full pass through every room" },
};

/**
 * Realistic duration presets per room (minutes), quick → deep. The tier index
 * also drives how many tasks each role gets (3, 4 or 5) — see tasksPerRole.
 */
export const ROOM_DURATIONS: Record<RoomKey, [number, number, number]> = {
  kitchen: [20, 30, 45],
  living: [15, 25, 40],
  bedroom: [15, 25, 40],
  whole: [45, 60, 90],
};

/** "45 min", "1 hr", "1 hr 30 min" — call .toUpperCase() for HUD labels. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export const ROLE_META: Record<
  Role,
  { label: string; system: string; tagline: string; color: string }
> = {
  clearer: {
    label: "Clearer",
    system: "Navigation",
    tagline: "Pick up clutter, put things away, clear every surface.",
    color: "blue",
  },
  cleaner: {
    label: "Cleaner",
    system: "Engines",
    tagline: "Wipe, straighten and clean the areas your crew clears.",
    color: "yellow",
  },
  finisher: {
    label: "Finisher",
    system: "Shields",
    tagline: "Trash out, floors swept, final reset locked in.",
    color: "red",
  },
};

export interface PlayerView {
  id: string;
  nickname: string;
  role: Role;
  isHost: boolean;
  ready: boolean;
  online: boolean;
  tasksDone: number;
  tasksTotal: number;
}

export interface TaskView {
  id: number;
  taskKey: string;
  role: Role;
  title: string;
  detail: string;
  orderIndex: number;
  dependsOnKey: string | null;
  done: boolean;
  /** false while its prerequisite task is not done yet */
  available: boolean;
  /** nickname of whoever owns the blocking prerequisite, for waiting copy */
  blockedByRole: Role | null;
}

export interface EventView {
  id: number;
  type: string;
  message: string;
  role: Role | null;
}

export interface MissionStateView {
  serverNow: number;
  mission: {
    code: string;
    room: RoomKey;
    roomLabel: string;
    durationMinutes: number;
    maxPlayers: number;
    status: MissionStatus;
    startedAt: number | null;
    countdownStartedAt: number | null;
    completedAt: number | null;
  };
  players: PlayerView[];
  tasks: TaskView[];
  events: EventView[];
}
