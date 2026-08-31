# Rail Run POC

Single-file browser game in `public/poc.html`. No framework, no build step, no database.

- Edit `public/poc.html` directly. Verify with the syntax one-liner in `README.md`.
- Smoke-harness (used by the agent): `/tmp/poc-smoke/smoke.js` — drives the game logic in Node with a
  mocked DOM, runs the 60-run stress loop, asserts on state. Restore it from the README/session history
  if it goes missing.
- Serve: `node serve-poc.cjs` (port 3010). TLS proxy for LAN: `/tmp/tg-tls/proxy.cjs` (:3000 -> :3010).
- Live: **https://franklin050187.github.io/train-game/** (GitHub Pages, auto-deployed from `master` via
  `.github/workflows/pages.yml`).
- The file is i18n'd (EN/FR with a `t()` / `fmt()` helper); keep both dictionaries in sync when adding text.