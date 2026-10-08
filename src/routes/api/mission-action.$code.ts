import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { missions, players, tasks } from "../../../db/schema.js";
import {
  buildStateView,
  getAuthedPlayer,
  getMissionByCode,
  jsonError,
  logEvent,
  systemMilestone,
} from "../../lib/server/game";
import { ROLE_META } from "../../lib/gameTypes";
import type { Role, RoomKey } from "../../lib/gameTypes";
import { generateMissionTasks, ROLE_ORDER } from "../../lib/tasks";

export const Route = createFileRoute("/api/mission-action/$code")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return jsonError("Invalid JSON body");
        }

        const mission = await getMissionByCode(params.code);
        if (!mission) return jsonError("Mission not found", 404);

        const action = String(body.action ?? "");

        // ------------------------------------------------------- join
        if (action === "join") {
          const nickname = String(body.nickname ?? "").trim().slice(0, 20);
          if (!nickname) return jsonError("Enter a nickname");
          if (mission.status !== "lobby")
            return jsonError("This mission already launched. Ask for a new code!");

          const crew = await db
            .select()
            .from(players)
            .where(eq(players.missionId, mission.id));
          if (crew.length >= mission.maxPlayers)
            return jsonError("The ship is full — all crew slots are taken");

          const taken = new Set(crew.map((p) => p.role));
          const requested = String(body.role ?? "");
          let role: Role;
          if (requested) {
            if (!ROLE_META[requested as Role])
              return jsonError("Pick a valid chore");
            if (taken.has(requested))
              return jsonError("That chore was just claimed — pick another");
            role = requested as Role;
          } else {
            // No preference sent: hand out the first free chore.
            role = ROLE_ORDER.find((r) => !taken.has(r)) ?? ROLE_ORDER[0];
          }

          const playerId = crypto.randomUUID();
          const token = crypto.randomUUID();
          await db.insert(players).values({
            id: playerId,
            token,
            missionId: mission.id,
            nickname,
            role,
            isHost: false,
          });
          await logEvent(
            mission.id,
            "join",
            `${nickname} boarded the ship as ${ROLE_META[role].label}`,
            role,
          );
          return Response.json({ playerId, token, role });
        }

        // All other actions require an authenticated crew member.
        const player = await getAuthedPlayer(
          mission.id,
          String(body.playerId ?? ""),
          String(body.token ?? ""),
        );
        if (!player) return jsonError("Not a member of this crew", 403);

        // ------------------------------------------------------- switch chore
        if (action === "role") {
          if (mission.status !== "lobby")
            return jsonError("Chores are locked in once the mission starts");

          const role = String(body.role ?? "") as Role;
          if (!ROLE_META[role]) return jsonError("Pick a valid chore");

          const crew = await db
            .select()
            .from(players)
            .where(eq(players.missionId, mission.id));
          if (crew.some((p) => p.id !== player.id && p.role === role))
            return jsonError("That chore was just claimed — pick another");

          if (player.role !== role) {
            await db
              .update(players)
              .set({ role })
              .where(eq(players.id, player.id));
            await logEvent(
              mission.id,
              "join",
              `${player.nickname} took over as ${ROLE_META[role].label}`,
              role,
            );
          }

          const fresh = await getMissionByCode(mission.code);
          return Response.json(await buildStateView(fresh ?? mission));
        }

        // ------------------------------------------------------- start
        if (action === "start") {
          if (!player.isHost) return jsonError("Only the host can start the mission", 403);
          if (mission.status !== "lobby") return jsonError("Mission already started");

          const crew = await db
            .select()
            .from(players)
            .where(eq(players.missionId, mission.id));
          if (crew.length < 2)
            return jsonError("You need at least 2 crew members to launch a mission");

          const generated = generateMissionTasks(
            mission.room as RoomKey,
            mission.durationMinutes,
            crew.map((p) => p.role as Role),
          );
          await db.insert(tasks).values(
            generated.map((t) => ({ ...t, missionId: mission.id })),
          );
          await db
            .update(missions)
            .set({ status: "active", startedAt: new Date() })
            .where(and(eq(missions.id, mission.id), eq(missions.status, "lobby")));
          await logEvent(
            mission.id,
            "start",
            "Mission started — all systems offline. Get to work, crew!",
          );
          return Response.json(await buildStateView({
            ...mission,
            status: "active",
            startedAt: new Date(),
          }));
        }

        // ------------------------------------------------------- complete task
        if (action === "complete") {
          if (mission.status !== "active" && mission.status !== "ready")
            return jsonError("Mission is not active");

          const taskId = Number(body.taskId);
          const taskRows = await db
            .select()
            .from(tasks)
            .where(eq(tasks.missionId, mission.id));
          const task = taskRows.find((t) => t.id === taskId);
          if (!task) return jsonError("Task not found", 404);
          if (task.role !== player.role)
            return jsonError("That objective belongs to a teammate", 403);
          if (task.done) return jsonError("Already completed");

          const doneKeys = new Set(
            taskRows.filter((t) => t.done).map((t) => t.taskKey),
          );
          if (task.dependsOnKey && !doneKeys.has(task.dependsOnKey))
            return jsonError("Waiting for a teammate to unlock this objective");

          await db
            .update(tasks)
            .set({ done: true, completedAt: new Date() })
            .where(eq(tasks.id, task.id));
          task.done = true;
          doneKeys.add(task.taskKey);

          const role = player.role as Role;
          const roleTasks = taskRows.filter((t) => t.role === role);
          const fraction =
            roleTasks.filter((t) => t.done).length / Math.max(roleTasks.length, 1);

          await logEvent(
            mission.id,
            "task",
            `${player.nickname} completed "${task.title}"`,
            role,
          );
          const milestone = systemMilestone(role, fraction);
          if (milestone) await logEvent(mission.id, "system", milestone, role);

          // Teamwork unlocks: tell the owners of tasks this one just opened.
          const unlocked = taskRows.filter(
            (t) => !t.done && t.dependsOnKey === task.taskKey,
          );
          for (const u of unlocked) {
            await logEvent(
              mission.id,
              "unlock",
              `${player.nickname} unlocked "${u.title}" for the ${ROLE_META[u.role as Role].label}`,
              u.role as Role,
            );
          }

          // All tasks done -> ship is fully operational.
          if (taskRows.every((t) => t.done)) {
            await db
              .update(missions)
              .set({ status: "ready" })
              .where(and(eq(missions.id, mission.id), eq(missions.status, "active")));
            await logEvent(
              mission.id,
              "system",
              "ALL SYSTEMS ONLINE — launch sequence unlocked!",
            );
          }

          const fresh = await getMissionByCode(mission.code);
          return Response.json(await buildStateView(fresh ?? mission));
        }

        // ------------------------------------------------------- ready to launch
        if (action === "ready") {
          if (mission.status !== "ready" && mission.status !== "countdown")
            return jsonError("The ship is not ready for launch yet");

          const ready = Boolean(body.ready);
          if (mission.status === "ready") {
            await db
              .update(players)
              .set({ ready })
              .where(eq(players.id, player.id));

            if (ready) {
              await logEvent(
                mission.id,
                "ready",
                `${player.nickname} is holding the launch lever`,
                player.role as Role,
              );
              const crew = await db
                .select()
                .from(players)
                .where(eq(players.missionId, mission.id));
              if (crew.every((p) => p.ready)) {
                const updated = await db
                  .update(missions)
                  .set({ status: "countdown", countdownStartedAt: new Date() })
                  .where(
                    and(eq(missions.id, mission.id), eq(missions.status, "ready")),
                  )
                  .returning();
                if (updated.length > 0) {
                  await logEvent(
                    mission.id,
                    "countdown",
                    "All crew ready — LAUNCH COUNTDOWN INITIATED",
                  );
                }
              }
            }
          }

          const fresh = await getMissionByCode(mission.code);
          return Response.json(await buildStateView(fresh ?? mission));
        }

        return jsonError("Unknown action");
      },
    },
  },
});
