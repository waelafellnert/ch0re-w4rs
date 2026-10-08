import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { players } from "../../../db/schema.js";
import {
  buildStateView,
  getAuthedPlayer,
  getMissionByCode,
  jsonError,
} from "../../lib/server/game";

export const Route = createFileRoute("/api/mission/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const mission = await getMissionByCode(params.code);
        if (!mission) return jsonError("Mission not found", 404);

        // Heartbeat: polling the state proves the player is still connected.
        const url = new URL(request.url);
        const pid = url.searchParams.get("pid") ?? "";
        const token = url.searchParams.get("token") ?? "";
        if (pid && token) {
          const player = await getAuthedPlayer(mission.id, pid, token);
          if (player) {
            await db
              .update(players)
              .set({ lastSeenAt: new Date() })
              .where(eq(players.id, player.id));
          }
        }

        const state = await buildStateView(mission);
        return Response.json(state, {
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
