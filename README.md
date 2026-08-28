# Railway Reclamation

A single-player railroad-rebuilding simulation. The railway network of a frontier nation was shattered
in the Greening — track lifted, towns cut off, industry idling. You are the first Conductor back:
rebuild cities, haul freight, research rail tech, and complete the Great Loop to revive the frontier.

Built as an engine-first vertical MVP: the entire simulation lives in `src/game/` as pure, deterministic,
client-safe TypeScript, wrapped by a Next.js app that persists one game document per user.

## Stack

- **Engine** — 18 pure-TS modules, seeded RNG, no Node imports (Vitest suite in `tests/`)
- **Persistence** — Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3`; one JSON game document per user
- **Auth** — HMAC-signed stateless session cookie (`tg_session`), bcrypt password hashing
- **App** — Next.js (App Router) server actions, `proxy.ts` route gating, mobile-first 9-tab game shell

## Getting started

```bash
npm install
cp .env.example .env        # generate a SESSION_SECRET, set DATABASE_URL=file:./dev.db
npx prisma db push          # create the sqlite schema
npm run dev                 # http://localhost:3000
```

Register an account and start your career — or load the demo snapshot to explore a mid-game save.
The tutorial overlay walks the 9 tabs on your first visit.

## Commands

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Start the dev server                          |
| `npm test`           | Run the Vitest engine suite (49 tests)        |
| `npm run typecheck`  | Type-check the whole repo                     |
| `npm run lint`       | ESLint                                        |
| `npx playwright test`| Mobile (390×844) E2E: register → play → persist |

## Layout

```
src/game/    pure simulation engine (world, trains, jobs, economy, endgame, …)
src/lib/     persistence (db/repo), auth, server actions
src/app/     routes: /, /login, /register, /game, /leaderboard
src/components/  GameShell, panel components, forms, tutorial overlay
e2e/         Playwright end-to-end suite
decisions.tsv  decision log kept while building
```

## Gameplay loop

Towns post contracts each morning. Each contract needs a train in the right yard with enough cargo
capacity. Dispatch trains, advance time, and respond to mid-journey decisions (bandits, breakdowns,
blockades). Spend earnings on city buildings (safety, more contracts), wagons, and rail research.
At reputation 80 the Great Loop unlocks: fund every spur around the map to win freeplay and prestige.