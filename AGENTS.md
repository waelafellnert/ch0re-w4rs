# AGENTS.md — Chore Co-op

A real-time multiplayer chore game: 2–3 players on separate phones complete real household tasks to power up a shared spaceship and launch it together.

## Architecture

**Framework:** TanStack Start (React 19) deployed on Netlify via `@netlify/vite-plugin-tanstack-start`. SSR shell + client-side game logic. **Database:** Netlify Database (Postgres) through Drizzle ORM (`drizzle-orm@beta` — the `beta` dist-tag is required for the `drizzle-orm/netlify-db` adapter; do not "upgrade" it to latest).

### Multiplayer model

There are no WebSockets. Real-time sync is **fast polling** (2s normally, 0.9s during launch phases) against a single state endpoint. All game state is persistent in Postgres, which is what makes reconnects trivial: each device stores `{playerId, token}` per mission code in localStorage (`src/lib/session.ts`) and resumes by polling again.

- `GET /api/mission/$code` → full `MissionStateView` (players, tasks, events, timestamps, `serverNow`). Also doubles as the heartbeat: an authed poll updates `players.last_seen_at` (online = seen <15s ago).
- `POST /api/create-mission` → creates mission + host player, returns `{code, playerId, token}`.
- `POST /api/mission-action/$code` → `{action: join|start|complete|ready, ...}`. All actions except `join` require `playerId` + `token` (the token is a per-player secret; player ids are public to teammates).

Mission status machine: `lobby → active → ready → countdown → complete`. `ready` is set when the last task completes; `countdown` when every player holds the launch button (`players.ready`); `complete` is settled lazily in `settleMission()` when a poll arrives after countdown+launch-animation time (no background jobs). **Countdown sync:** clients compute `clockOffset = serverNow - Date.now()` from each poll and render the countdown off the shared `countdownStartedAt` timestamp, so all phones count in step.

### Task system

`src/lib/tasks.ts` holds all task content: 5 ordered templates per role per room (4 rooms × 3 roles). Duration slices them (5 min → 3 tasks/role, 10 → 4, 15 → 5). Dependency rule (enforced by convention in the templates): Clearer tasks depend on nothing, Cleaner may depend on Clearer, Finisher may depend on Clearer/Cleaner — this makes 2-player missions (no Finisher) safe to generate by just dropping the role. Dependencies pointing at sliced-out tasks are nulled at generation. Tasks are materialized into the `tasks` table at mission start; `available` is derived (`!done && dependency done`), never stored.

Roles are assigned by join order: host = Clearer, 2nd = Cleaner, 3rd = Finisher. Role→system mapping: Clearer→Navigation (blue), Cleaner→Engines (yellow), Finisher→Shields (red). Ship progress = fraction of that role's tasks done.

### Key directories

- `db/schema.ts` — Drizzle schema (missions, players, tasks, events). Any change requires `npx drizzle-kit generate --name <name>`; migrations land in `netlify/database/migrations/` and are applied by Netlify at deploy.
- `src/routes/api/` — server routes (TanStack `server.handlers`). Named without nesting conflicts on purpose (`mission.$code` vs `mission-action.$code`): a route file that has children becomes a layout and its handlers may not fire.
- `src/lib/server/game.ts` — shared server logic (state view builder, auth, lazy settling, event logging).
- `src/lib/useMission.ts` — the client sync hook: polling, clock offset, actions, and deriving toasts/sounds from the `events` feed (tracks last seen event id; own-role events are filtered to avoid echoing a player's own actions back at them).
- `src/lib/sound.ts` — WebAudio-synthesized SFX + vibration + sound/vibration settings (localStorage). No audio files.
- `src/components/Spaceship.tsx` — the shared ship SVG; system glow driven by `nav`/`eng`/`shields` (0–1) props and `mode` (grounded/launching/flying).
- `src/routes/` — pages: `index` (welcome), `create`, `m.$code` (join gate → lobby → mission → launch overlay → complete, all driven by mission status).

## Conventions & gotchas

- Mobile-first: single column, max-width 480px, large touch targets. Desktop just widens the column.
- Styling is hand-written CSS in `src/styles.css` (CSS variables for the palette) on top of a Tailwind v4 import; game components use semantic classes, not utility soup.
- Hydration: anything reading localStorage or `Date.now()` for the first paint must go through `useEffect`, not a `useState` initializer (see `useMission`, welcome screen resume banner). The starfield uses a **seeded** PRNG so SSR and client markup match.
- Fonts: Bungee (display) + Chakra Petch (body) via Google Fonts in `__root.tsx`.
- `prefers-reduced-motion` is honored in CSS (big block at the end of `styles.css`) — keep new animations inside that contract.
- No accounts, no leaderboards, no competitive scoring — deliberate product decisions, don't add them.
- The event feed (`events` table) powers teammate notifications; cap reads at the last 30. Toast/sound mapping lives in `useMission.applyState`.
