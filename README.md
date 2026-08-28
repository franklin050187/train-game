# Railway Reclamation

[![CI](https://github.com/franklin050187/train-game/actions/workflows/ci.yml/badge.svg)](https://github.com/franklin050187/train-game/actions/workflows/ci.yml)

A single-player railroad-rebuilding simulation. The railway network of a frontier nation was shattered
in the Greening — track lifted, towns cut off, industry idling. You are the first Conductor back:
rebuild cities, haul freight, research rail tech, and complete the Great Loop to revive the frontier.

Built as an engine-first vertical MVP: the entire simulation lives in `src/game/` as pure, deterministic,
client-safe TypeScript, wrapped by a Next.js app that persists one game document per user.

## Stack

- **Engine** — 18 pure-TS modules, seeded RNG, no Node imports (Vitest suite in `tests/`)
- **Persistence** — Prisma 7 + Postgres via `@prisma/adapter-pg` (Neon-compatible); one JSON game document per user
- **Auth** — HMAC-signed stateless session cookie (`tg_session`), bcrypt password hashing
- **App** — Next.js (App Router) server actions, `proxy.ts` route gating, mobile-first 9-tab game shell

## Getting started

Requires a Postgres database (Neon free tier works for local + Vercel).

```bash
npm install
cp .env.example .env          # set DATABASE_URL to your Postgres; generate SESSION_SECRET
openssl rand -hex 32          # use the output as SESSION_SECRET
npx prisma migrate deploy     # apply prisma/migrations to your database
npm run dev                   # http://localhost:3000
```

Register an account and start your career — or load the demo snapshot to explore a mid-game save.
The tutorial overlay walks the 9 tabs on your first visit.

## Deploying to Vercel

1. Push the repo, import into Vercel.
2. In **Project → Settings → Environment Variables** add:
   - `DATABASE_URL` — your Neon Postgres connection string (start with `postgresql://`, append `?sslmode=require`)
   - `SESSION_SECRET` — any long random hex string
3. Defaults are fine: framework detects Next.js, build runs `npm run build` (which generates the Prisma client first).
4. After first deploy, run the migration on the production database once:
   `DATABASE_URL=<prod-url> npx prisma migrate deploy` (or add it as a one-off in Vercel build step).

The database is shared between local dev and production if you point at the same Neon URL — use a separate branch/database for prod if you want isolation.

## Commands

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Start the dev server                          |
| `npm test`           | Run the Vitest engine suite (49 tests)        |
| `npm run typecheck`  | Type-check the whole repo                     |
| `npm run lint`       | ESLint                                        |
| `npx playwright test`| Mobile (390×844) E2E: register → play → persist (needs running server + DB) |

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