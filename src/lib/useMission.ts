// Mission state synchronisation: polls the server, exposes actions,
// derives toasts + sound effects from the live event feed.

import { useCallback, useEffect, useRef, useState } from "react";
import type { MissionStateView, Role } from "./gameTypes";
import type { CrewSession } from "./session";
import { getSession, saveSession } from "./session";
import { sfx } from "./sound";

export interface GameToast {
  id: number;
  message: string;
  role: Role | null;
  type: string;
}

interface UseMissionResult {
  state: MissionStateView | null;
  session: CrewSession | null;
  loading: boolean;
  offline: boolean;
  error: string | null;
  toasts: GameToast[];
  dismissToast: (id: number) => void;
  clockOffset: number;
  join: (nickname: string, role: Role) => Promise<string | null>;
  changeRole: (role: Role) => Promise<string | null>;
  start: () => Promise<string | null>;
  completeTask: (taskId: number) => Promise<string | null>;
  setReady: (ready: boolean) => Promise<string | null>;
}

const POLL_MS = 2000;
const POLL_FAST_MS = 900;

export function useMission(code: string): UseMissionResult {
  const [state, setState] = useState<MissionStateView | null>(null);
  // Loaded in an effect (not the initializer) so SSR and the first client
  // render agree — localStorage only exists in the browser.
  const [session, setSession] = useState<CrewSession | null>(null);
  useEffect(() => {
    setSession(getSession(code));
  }, [code]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<GameToast[]>([]);
  const [clockOffset, setClockOffset] = useState(0);

  const lastEventId = useRef<number | null>(null);
  const prevStatus = useRef<string | null>(null);
  const failCount = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const stateRef = useRef(state);
  stateRef.current = state;

  const pushToast = useCallback((t: GameToast) => {
    setToasts((prev) => [...prev.slice(-3), t]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const applyState = useCallback(
    (next: MissionStateView) => {
      setState(next);
      setClockOffset(next.serverNow - Date.now());

      const myRole = sessionRef.current?.role ?? null;

      // Status-driven sounds (fire once per transition)
      if (prevStatus.current && prevStatus.current !== next.mission.status) {
        if (next.mission.status === "ready") sfx.allSystems();
      }
      prevStatus.current = next.mission.status;

      // Event-driven toasts + sounds
      if (lastEventId.current === null) {
        lastEventId.current =
          next.events.length > 0 ? next.events[next.events.length - 1].id : 0;
      } else {
        const fresh = next.events.filter((e) => e.id > (lastEventId.current ?? 0));
        for (const e of fresh) {
          lastEventId.current = e.id;
          const mine = e.role !== null && e.role === myRole;
          switch (e.type) {
            case "task":
              if (!mine) {
                pushToast({ id: e.id, message: e.message, role: e.role, type: e.type });
                sfx.teammate();
              }
              break;
            case "system":
              if (e.message.startsWith("ALL SYSTEMS")) {
                pushToast({ id: e.id, message: e.message, role: null, type: e.type });
                // sound handled by the status transition above
              } else if (!mine) {
                pushToast({ id: e.id, message: e.message, role: e.role, type: e.type });
                if (e.message.includes("FULLY ONLINE")) sfx.systemOnline();
              }
              break;
            case "unlock":
              if (mine) {
                pushToast({
                  id: e.id,
                  message: "Your teammate unlocked your next objective!",
                  role: e.role,
                  type: e.type,
                });
                sfx.unlock();
              }
              break;
            case "join":
            case "ready":
              pushToast({ id: e.id, message: e.message, role: e.role, type: e.type });
              sfx.teammate();
              break;
            case "start":
            case "countdown":
              pushToast({ id: e.id, message: e.message, role: null, type: e.type });
              break;
          }
        }
      }
    },
    [pushToast],
  );

  // Polling loop
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      const s = sessionRef.current;
      const qs = s ? `?pid=${s.playerId}&token=${s.token}` : "";
      try {
        const res = await fetch(`/api/mission/${code}${qs}`, {
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (res.status === 404) {
          setError("Mission not found. Check the room code.");
          setLoading(false);
          return; // stop polling — the mission doesn't exist
        }
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as MissionStateView;
        if (cancelled) return;
        failCount.current = 0;
        setOffline(false);
        setError(null);
        applyState(data);
        setLoading(false);
      } catch {
        if (cancelled) return;
        failCount.current += 1;
        if (failCount.current >= 3) setOffline(true);
      }
      const status = stateRef.current?.mission.status;
      const fast = status === "ready" || status === "countdown";
      timer = window.setTimeout(tick, fast ? POLL_FAST_MS : POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [code, applyState]);

  const post = useCallback(
    async (body: Record<string, unknown>): Promise<string | null> => {
      try {
        const s = sessionRef.current;
        const res = await fetch(`/api/mission-action/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            playerId: s?.playerId,
            token: s?.token,
          }),
        });
        const data = await res.json();
        if (!res.ok) return (data?.error as string) ?? "Something went wrong";
        if (data?.mission) applyState(data as MissionStateView);
        return null;
      } catch {
        return "Connection lost — try again";
      }
    },
    [code, applyState],
  );

  const join = useCallback(
    async (nickname: string, role: Role): Promise<string | null> => {
      try {
        const res = await fetch(`/api/mission-action/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", nickname, role }),
        });
        const data = await res.json();
        if (!res.ok) return (data?.error as string) ?? "Could not join";
        const next: CrewSession = {
          code: code.toUpperCase(),
          playerId: data.playerId,
          token: data.token,
          nickname,
          role: data.role,
          savedAt: Date.now(),
        };
        saveSession(next);
        setSession(next);
        return null;
      } catch {
        return "Connection lost — try again";
      }
    },
    [code],
  );

  const start = useCallback(() => post({ action: "start" }), [post]);
  const changeRole = useCallback(
    async (role: Role): Promise<string | null> => {
      const err = await post({ action: "role", role });
      if (!err) {
        // The role lives in the device session too (event filtering, resume).
        const s = sessionRef.current;
        if (s) {
          const next = { ...s, role };
          saveSession(next);
          setSession(next);
        }
      }
      return err;
    },
    [post],
  );
  const completeTask = useCallback(
    (taskId: number) => post({ action: "complete", taskId }),
    [post],
  );
  const setReady = useCallback(
    (ready: boolean) => post({ action: "ready", ready }),
    [post],
  );

  return {
    state,
    session,
    loading,
    offline,
    error,
    toasts,
    dismissToast,
    clockOffset,
    join,
    changeRole,
    start,
    completeTask,
    setReady,
  };
}
