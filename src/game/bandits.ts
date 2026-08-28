import { rngPick, type Rng } from './rng'
import type { EncounterKind, GameState, Journey, JourneyEncounter } from './types'

export function baseThreat(state: GameState, journey: Journey, regionThreat: number): number {
  const cargoValue = journey.cargo.reduce((s, c) => s + c.tons * 200, 0) + journey.passengers * 30
  const security = journey.armor / 30 + (journey.security ?? 0) * 0.2
  const t =
    regionThreat *
    (1 + cargoValue / 40000) *
    (1 + (state.threatLevel - 1) * 0.15) *
    (1 - Math.min(0.7, security * 0.08))
  return Math.max(0.005, t)
}

export function generateEncounters(state: GameState, journey: Journey, rng: Rng, regionThreat: number): JourneyEncounter[] {
  const threat = baseThreat(state, journey, regionThreat)
  const n = Math.round(Math.max(1, Math.min(5, journey.distanceKm / 230 * threat * 22)))
  const encounters: JourneyEncounter[] = []
  for (let i = 0; i < n; i++) {
    const frac = (i + 1) / (n + 1) + rng() * 0.08 - 0.04
    const travelMin = (journey.distanceKm / 55) * 60
    const atMinutes = journey.dispatchAt + Math.floor(travelMin * frac)
    encounters.push(buildEncounter(state, journey, i, atMinutes, rng))
  }
  return encounters
}

function buildEncounter(state: GameState, journey: Journey, index: number, atMinutes: number, rng: Rng): JourneyEncounter {
  const kind = pickKind(rng, state.threatLevel)
  const tpl = encounterTemplates[kind]
  return {
    id: `${journey.id}-e${index}`,
    kind,
    atMinutes,
    title: tpl.title,
    text: tpl.text,
    threat: 0.3 + rng() * 0.4,
    options: tpl.options.map((o) => ({ ...o })),
    resolved: false,
  }
}

function pickKind(rng: Rng, threatLevel: number): EncounterKind {
  const pool: EncounterKind[] = ['bandit-ambush', 'bandit-raider', 'track-sabotage', 'weather']
  if (threatLevel >= 2) pool.push('breakdown', 'signal')
  if (threatLevel >= 4) pool.push('inspection')
  return rngPick(rng, pool)
}

const encounterTemplates: Record<EncounterKind, { title: string; text: string; options: JourneyEncounter['options'] }> = {
  'bandit-ambush': {
    title: 'Bandit ambush',
    text: 'Recon reports raiders lying in wait beside the cuts.',
    options: [
      { id: 'run', label: 'Maintain speed', description: 'Try to outrun them. Highest escape chance, normal risk.', effects: { speed: 1, damage: 1 } },
      { id: 'defensive', label: 'Defensive formation', description: 'Slow down, brace for anything.', effects: { speed: 0.55, damage: 0.5 } },
      { id: 'guards', label: 'Deploy guards', description: 'Send the hired guns out.', cost: 1400, effects: { threat: 0.45, damage: 0.7 } },
      { id: 'armor', label: 'Use armored wagon', description: 'Fall back behind the armor plate.', effects: { threat: 0.6, damage: 0.4 } },
      { id: 'detour', label: 'Alternate route', description: 'Reroute around the ambush.', effects: { delayHours: 8, threat: 0.45 } },
    ],
  },
  'bandit-raider': {
    title: 'Raider pack sighted',
    text: 'A fast-moving group is closing from the east.',
    options: [
      { id: 'run', label: 'Open the throttle', description: 'Power through on full burn.', effects: { speed: 1.1, damage: 1.2 } },
      { id: 'defensive', label: 'Pull into staggered speed', description: 'Less speed, harder to hit.', effects: { speed: 0.6, damage: 0.55 } },
      { id: 'guards', label: 'Return fire', description: 'Guards in the wagon ports.', cost: 1100, effects: { threat: 0.4, damage: 0.8 } },
    ],
  },
  'track-sabotage': {
    title: 'Sabotage on the line',
    text: 'Fishplates pulled, rails shifted ahead.',
    options: [
      { id: 'stop', label: 'Stop and inspect', description: 'Slow pass over the damaged stretch.', effects: { speed: 0.4, delayHours: 3 } },
      { id: 'repair', label: 'Repair crew forward', description: 'Fix it fast and pay the crew.', cost: 2600, effects: { delayHours: 1 } },
      { id: 'push', label: 'Run the risk', description: 'At speed the break might take you down.', effects: { damage: 1.6, delayHours: 2 } },
    ],
  },
  breakdown: {
    title: 'A wheel bearing is failing',
    text: 'The next stop is too far; the bearing is throwing heat.',
    options: [
      { id: 'coast', label: 'Coast to the next stop', description: 'Slow and gentle.', effects: { speed: 0.45, delayHours: 2 } },
      { id: 'swap', label: 'Wheelset swap', description: 'Pay a trackside crew.', cost: 3200, effects: { delayHours: 4, damage: 0.3 } },
    ],
  },
  weather: {
    title: 'A front has moved in',
    text: 'Snow and ice across the high cuts.',
    options: [
      { id: 'plow', label: 'Snowplow through', description: 'Slow but steady.', effects: { speed: 0.5, delayHours: 1 } },
      { id: 'wait', label: 'Halt for the storm', description: 'Sit it out in a passing loop.', effects: { delayHours: 6 } },
    ],
  },
  signal: {
    title: 'Dim signal ahead',
    text: 'A stop board flickers in the murk.',
    options: [
      { id: 'proceed', label: 'Proceed at caution', description: 'Slow, careful, legal.', effects: { speed: 0.7, delayHours: 1 } },
      { id: 'stop', label: 'Stop and radio', description: 'Waste minutes, buy certainty.', effects: { delayHours: 2, damage: 0.2 } },
    ],
  },
  inspection: {
    title: 'Security inspection',
    text: 'A convoy checkpoint has flagged this train.',
    options: [
      { id: 'comply', label: 'Comply', description: 'Let them look.', effects: { delayHours: 2 } },
      { id: 'pay', label: 'Pay the bribe', description: 'Credits buy a shortcut.', cost: 1800, effects: {} },
      { id: 'bypass', label: 'Bypass the checkpoint', description: 'Risky route around it.', effects: { delayHours: 5, damage: 0.4 } },
    ],
  },
}