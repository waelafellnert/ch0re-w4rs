import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db/index.js";
import { missions, players } from "../../../db/schema.js";
import { jsonError, logEvent, randomCode } from "../../lib/server/game";
import { ROLE_META, ROOM_DURATIONS, ROOM_META } from "../../lib/gameTypes";
import type { Role, RoomKey } from "../../lib/gameTypes";

export const Route = createFileRoute("/api/create-mission")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return jsonError("Invalid JSON body");
        }

        const room = String(body.room ?? "") as RoomKey;
        const durationMinutes = Number(body.durationMinutes);
        const maxPlayers = Number(body.maxPlayers);
        const nickname = String(body.nickname ?? "").trim().slice(0, 20);
        const role = String(body.role ?? "clearer") as Role;

        if (!ROOM_META[room]) return jsonError("Pick a valid room preset");
        if (!ROOM_DURATIONS[room].includes(durationMinutes))
          return jsonError("Pick one of the mission duration presets");
        if (![2, 3].includes(maxPlayers))
          return jsonError("Crew size must be 2 or 3");
        if (!nickname) return jsonError("Enter a nickname");
        if (!ROLE_META[role]) return jsonError("Pick a valid chore");

        // Retry a couple of times in the unlikely event of a code collision.
        let mission: typeof missions.$inferSelect | null = null;
        for (let attempt = 0; attempt < 5 && !mission; attempt++) {
          try {
            const [row] = await db
              .insert(missions)
              .values({
                code: randomCode(),
                room,
                durationMinutes,
                maxPlayers,
                status: "lobby",
              })
              .returning();
            mission = row;
          } catch {
            // code collision — try again
          }
        }
        if (!mission) return jsonError("Could not create mission, try again", 500);

        const playerId = crypto.randomUUID();
        const token = crypto.randomUUID();
        await db.insert(players).values({
          id: playerId,
          token,
          missionId: mission.id,
          nickname,
          role, // the host picks their own chore; crewmates pick from the rest
          isHost: true,
        });

        await logEvent(
          mission.id,
          "join",
          `${nickname} boarded the ship as ${ROLE_META[role].label}`,
          role,
        );

        return Response.json({
          code: mission.code,
          playerId,
          token,
          role,
        });
      },
    },
  },
});
