import { BUILDS, CITY_LEVELS, INDUSTRIES } from './catalogs'
import { CITY_BY_ID } from './world'
import { addNotification, checkAchievementsUnlocked } from './economy'
import type { BuildKind, CityState, ConstructionState, GameState } from './types'

export interface BuildResult {
  ok: boolean
  error?: string
}

export function startConstruction(state: GameState, cityId: string, kind: string): BuildResult {
  const city = state.cities[cityId]
  if (!city) return { ok: false, error: 'City not found.' }
  const def = CITY_BY_ID[cityId]

  const isIndustry = Boolean(INDUSTRIES[kind])
  const isBuild = Boolean(BUILDS[kind as BuildKind])
  if (!isIndustry && !isBuild) return { ok: false, error: 'Unknown project.' }

  const name = isIndustry ? INDUSTRIES[kind].name : BUILDS[kind as BuildKind].name
  const cost = isIndustry ? INDUSTRIES[kind].buildCost : BUILDS[kind as BuildKind].cost
  const days = isIndustry ? INDUSTRIES[kind].buildTimeDays : Math.max(6, Math.round(cost / 5200))

  if (state.credits < cost) return { ok: false, error: `Not enough credits (${cost}).` }
  const already = city.constructions.some((c) => c.kind === kind && !c.applied)
  if (already) return { ok: false, error: 'Already under construction here.' }

  const level = def ? cityLevelForInfluence(city.influence, def.influence) : city.level
  if (isIndustry) {
    const idef = INDUSTRIES[kind]
    if (city.level < idef.levelRequired) return { ok: false, error: `City level too low (needs ${idef.levelRequired}).` }
  } else {
    const buildDef = BUILDS[kind as BuildKind]
    if (!buildDef) return { ok: false, error: 'Unknown build.' }
    if (city.influence < (CITY_LEVELS[city.level - 1]?.requiresInfluence ?? 0)) {
      return { ok: false, error: `Gain more influence first (${CITY_LEVELS[city.level - 1]?.requiresInfluence}).` }
    }
    if (city.builds.some((b) => b.kind === kind)) return { ok: false, error: 'Already built here.' }
    void level
  }

  state.credits -= cost
  city.influence = Math.min(100, city.influence + (isIndustry ? 10 : BUILD_INFLUENCE[kind as BuildKind] ?? 6))
  city.constructions.push({
    id: `bc-${state.eventCounter++}`,
    cityId,
    kind,
    name,
    cost,
    startAt: state.minutes,
    finishAt: state.minutes + days * 1440,
    applied: false,
  })
  addNotification(state, 'info', `${def.name}: construction started`, `${name}, ${days} days.`, false)
  return { ok: true }
}

const BUILD_INFLUENCE: Record<BuildKind, number> = {
  watchtower: 5,
  'patrol-station': 10,
  'security-depot': 15,
  'military-base': 30,
  'repair-depot': 6,
  'fuel-station': 8,
  'cargo-terminal': 14,
  'automated-loading': 20,
  hospital: 12,
  housing: 8,
  'food-distribution': 5,
  'water-treatment': 10,
  heating: 15,
  mine: 8,
  refinery: 12,
  factory: 18,
  agriculture: 7,
  warehouse: 4,
  'station-platform': 5,
  'rail-yard': 15,
  'maintenance-shed': 16,
}

function cityLevelForInfluence(current: number, base: number): number {
  void base
  let level = 1
  for (const def of CITY_LEVELS) {
    if (current >= def.requiresInfluence) level = def.level
  }
  return level
}

export function applyCompletedConstructions(state: GameState): void {
  for (const city of Object.values(state.cities)) {
    for (const c of city.constructions) {
      if (c.applied || c.finishAt > state.minutes) continue
      applyConstruction(state, city, c)
    }
  }
}

function applyConstruction(state: GameState, city: CityState, c: ConstructionState): void {
  c.applied = true
  const def = CITY_BY_ID[city.id]
  const indDef = INDUSTRIES[c.kind]
  if (indDef) {
    const existing = city.industries.find((i) => i.kind === c.kind)
    if (existing) {
      existing.operational = true
    } else {
      city.industries.push({ kind: c.kind, level: 1, operational: true, lastCheckDay: 0 })
    }
    state.stats.industriesRestored += 1
    addNotification(state, 'success', `${def.name}: ${c.name} online`, 'Industrial output restored.', false)
  } else {
    const existing = city.builds.find((b) => b.kind === c.kind)
    if (existing) {
      existing.level += 1
    } else {
      city.builds.push({ kind: c.kind as BuildKind, level: 1 })
    }
    addNotification(state, 'success', `${def.name}: ${c.name} complete`, 'Construction finished.', false)
    if (c.kind === 'station-platform' || c.kind === 'rail-yard') {
      city.level = Math.max(city.level, cityLevelForInfluence(city.influence, def?.influence ?? 0))
    }
  }
  checkAchievementsUnlocked(state)
}

export function cityLevelWithBuilds(city: CityState): number {
  const bonus = city.builds.some((b) => b.kind === 'rail-yard') ? 1 : 0
  return Math.min(5, city.level + bonus)
}