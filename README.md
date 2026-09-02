# Rail Run — Game Loop POC

A single-file browser game: rebuild a shattered frontier rail network as the first Conductor back. 
Haul cargo between cities, take contracts, pick risk, buy wagons and engines, survive mid-journey
events, and grow towns from spur to industrial hub.

Everything lives in `public/poc.html` — no build step, no runtime, no database.

## Play Online

**https://franklin050187.github.io/train-game/** — GitHub Pages deploy (auto-updated on push to `master`).

## Run Locally

Serve the `public/` directory:

```bash
node serve-poc.cjs            # http://127.0.0.1:3010/poc.html
PORT=8080 node serve-poc.cjs  # optional custom port
```

The same file works by opening it directly, but serving keeps `localStorage` on the `poc.html` origin
(it is shared with nothing else).

### TLS Proxy (LAN Access)

For https access from other devices on your network:

```bash
cd /tmp/tg-tls && node proxy.cjs   # https://<your-ip>:3000 -> http://127.0.0.1:3010
```

Stop it via `kill $(cat /tmp/tg-tls/proxy.pid)`.

## Gameplay Loop

Villages and cities post contracts. Each needs enough cargo capacity; some lock behind a specific wagon.
Pick a contract, choose a risk level (calm / rush / danger — leans into payoff vs. events and penalties),
then resolve mid-journey decisions. Events can cost money, cargo, or reward you — timed contracts add a
late-fee if you arrive past the deadline, failed runs take a rarity-scaled penalty. Earnings buy engines,
wagons (owned duplicates, equip into your consist up to the slot cap), and city growth, which unlocks
bigger cargo, better rewards, and legendary contracts.

## Layout

```
public/
  poc.html              thin shell: HTML structure + script tags + boot sequence
  css/style.css         all CSS (responsive, animations, components)
  js/
    i18n.js             EN/FR dictionaries + t()/fmt()/toggleLang() helpers
    data.js             cities, cargoes, wagons, engines, line definitions
    pixelart.js         sprite data + train rendering (pixCanvas/pixHTML)
    game.js             state management, train math, contracts, events, journey logic
    ui.js               tab rendering (train/contract/map/progress), animations, result screen
serve-poc.cjs           tiny zero-dependency static server
.github/workflows/      GitHub Pages deploy (copies poc.html -> index.html)
decisions.tsv           decision log kept while building
```

No external assets, no fonts, no imports. Verify a change with:

```bash
for f in public/js/*.js; do node -e "new Function(require('fs').readFileSync('$f','utf8')); console.log('$f OK');"; done
```

## Smoke Test

```bash
timeout 90 node /tmp/poc-smoke/smoke.js
```

Runs 60 simulated journeys in Node with a mocked DOM; must complete with no assertions failed.
