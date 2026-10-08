# Chore Co-op

A multiplayer, mobile-first web game where 2–3 people complete **real household chores** together to launch a shared spaceship. Your home is the level. Your phones are the controllers. Clean together. Launch together.

## How it works

1. **Create a mission** — the host picks a zone (Kitchen, Living Room, Bedroom, or Whole House), crew size (2 or 3), and a mission target (5, 10, or 15 minutes).
2. **Share the room code** — teammates join from their own phones via a 4-letter code, link, or QR code. No accounts.
3. **Play your role** — each crew member gets a complementary role tied to a ship system:
   - **Clearer** (blue) → Navigation: picks up clutter and clears surfaces
   - **Cleaner** (yellow) → Engines: wipes and cleans the cleared areas
   - **Finisher** (red, 3-player only) → Shields: trash, floors, final reset
4. **Do real chores** — objectives are auto-generated from predefined lists per room/duration. Some tasks unlock only after a teammate finishes theirs (you can't wipe a counter nobody cleared). Marking a task done upgrades the shared ship in real time on every phone.
5. **Launch together** — when all systems are online, every player presses and holds their launch lever. A synchronized countdown fires on all devices, the ship lifts off, and the crew gets a shareable mission-complete screen.

The timer is a target, not a deadline — missions never fail for taking too long.

## Tech stack

- **TanStack Start** (React 19, file-based routing, server routes) on **Netlify**
- **Netlify Database** (managed Postgres) with **Drizzle ORM** — persistent room/mission state
- Real-time sync via fast polling of a shared mission state endpoint (reconnect-safe: crew credentials are stored per-device, so closing the browser doesn't drop you from the crew)
- **Tailwind CSS v4** + custom HUD styling, Bungee + Chakra Petch typography
- WebAudio-synthesized sound effects (no audio assets) and vibration feedback, both user-toggleable; respects `prefers-reduced-motion`

## Local development

```bash
pnpm install
netlify dev --port 8889
```

Then open `http://localhost:8889`. The Netlify CLI provides local emulation of the database and server routes. To test multiplayer, open the same mission URL in a second browser/incognito window.

## Database migrations

The schema lives in `db/schema.ts`. After changing it, generate a migration (applied automatically at deploy time):

```bash
npx drizzle-kit generate --name <descriptive_name>
```
