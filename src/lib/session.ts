// Per-mission crew credentials stored on the device, so a player can close
// the browser and rejoin the same mission with one tap.

import type { Role } from "./gameTypes";

export interface CrewSession {
  code: string;
  playerId: string;
  token: string;
  nickname: string;
  role: Role;
  savedAt: number;
}

const KEY = "choreco:sessions";
const LAST_KEY = "choreco:last-code";

function readAll(): Record<string, CrewSession> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getSession(code: string): CrewSession | null {
  return readAll()[code.toUpperCase()] ?? null;
}

export function saveSession(session: Omit<CrewSession, "savedAt">) {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[session.code.toUpperCase()] = { ...session, savedAt: Date.now() };
  // keep the most recent 8 sessions
  const entries = Object.entries(all)
    .sort((a, b) => b[1].savedAt - a[1].savedAt)
    .slice(0, 8);
  window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  window.localStorage.setItem(LAST_KEY, session.code.toUpperCase());
}

export function getLastSession(): CrewSession | null {
  if (typeof window === "undefined") return null;
  const code = window.localStorage.getItem(LAST_KEY);
  if (!code) return null;
  return getSession(code);
}

export function clearLastSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_KEY);
}
