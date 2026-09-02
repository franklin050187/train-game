# Rail Run POC

Browser game split across multiple files in `public/`. No framework, no build step, no database.

- Edit files under `public/` directly. Verify with the syntax one-liner in `README.md`.
- **Translation work:** edit `public/js/i18n.js` — keep the `en:` and `fr:` blocks in sync.
- **Game data changes:** edit `public/js/data.js` (cities, cargoes, wagons, engines).
- **New game features:** edit `public/js/game.js` (logic) and `public/js/ui.js` (rendering).
- Smoke-harness (used by the agent): `/tmp/poc-smoke/smoke.js` — drives the game logic in Node with a
  mocked DOM, runs the 60-run stress loop, asserts on state. Restore it from the README/session history
  if it goes missing.
- Serve: `node serve-poc.cjs` (port 3010). TLS proxy for LAN: `/tmp/tg-tls/proxy.cjs` (:3000 -> :3010).
- Live: **https://franklin050187.github.io/train-game/** (GitHub Pages, auto-deployed from `master` via
  `.github/workflows/pages.yml`).
