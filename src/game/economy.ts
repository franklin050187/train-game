import { BUILDS, INDUSTRIES, REPUTATION_ORDER, REPUTATION_SCORE } from './catalogs'
import { CITY_BY_ID, SEGMENT_BY_ID } from './world'
import { BALANCE } from './balance'
import { computeTrainStats } from './trains'
import type { BuildKind, CargoId, CityState, GameState, Notification } from './types'
import { CARGO } from './types'

export function addNotification(
  state: GameState,
  kind: Notification['kind'],
  title: string,
  body: string,
  critical = false,
  at = state.minutes,
): string {
  state.eventCounter += 1
  const id = `n${state.eventCounter}`
  state.notifications.unshift({ id, at, kind, title, body, critical })
  if (state.notifications.length > 60) state.notifications.length = 60
  return id
}

export function daysLeft(city: CityState, kind: CargoId): number | null {
  const def = CITY_BY_ID[city.id]
  if (!def) return null
  const rate = def.consumePerDay[kind] ?? 0
  if (rate <= 0) return null
  const stock = city.inventory[kind] ?? 0
  return stock / rate
}

export function repairSegments(state: GameState): void {
  const perDay = 0.012
  for (const seg of Object.values(state.segments)) {
    const def = SEGMENT_BY_ID[seg.id]
    if (!def) continue
    if (seg.quality < def.baseQuality) {
      seg.quality = Math.min(def.baseQuality, seg.quality + perDay)
    }
  }
}

function applyConsumption(state: GameState, city: CityState, def: (typeof CITY_BY_ID)[string]): void {
  const buildingMap: Partial<Record<BuildKind, Partial<Record<CargoId, number>>>> = {
    'food-distribution': { food: 0.1 },
    heating: { fuel: 0.08 },
  }
  for (const [k, rate] of Object.entries(def.consumePerDay)) {
    if (!rate) continue
    const kind = k as CargoId
    let r = rate
    for (const b of city.builds) {
      const mod = buildingMap[b.kind]?.[kind]
      if (mod) r *= 1 - mod
    }
    const stock = city.inventory[kind] ?? 0
    const consumed = Math.min(stock, Math.max(0, r))
    city.inventory[kind] = stock - consumed
    if (consumed < r) {
      state.stats.populationSupported = Math.max(0, state.stats.populationSupported - Math.round((r - consumed) * 40))
    }
  }
}

function applyProduction(state: GameState, city: CityState, def: (typeof CITY_BY_ID)[string]): void {
  const cap = def.storageCap
  for (const kind of def.produces) {
    const base = city.level * 5
    const stock = city.inventory[kind] ?? 0
    const max = cap[kind] ?? 200
    city.inventory[kind] = Math.min(max, stock + base)
  }
  for (const ind of city.industries) {
    const idef = INDUSTRIES[ind.kind]
    if (!idef) {
      ind.operational = false
      continue
    }
    const missing = Object.entries(idef.inputs).some(([kind, need]) => {
      return (city.inventory[kind as CargoId] ?? 0) < (need as number)
    })
    if (missing) {
      if (ind.operational) {
        addNotification(state, 'warning', `${def.name}: input shortage`, `${idef.name} halted for lack of inputs.`, true)
      }
      ind.operational = false
      continue
    }
    for (const [kind, need] of Object.entries(idef.inputs)) {
      city.inventory[kind as CargoId] = (city.inventory[kind as CargoId] ?? 0) - (need as number)
    }
    const stock = city.inventory[idef.produces] ?? 0
    const max = cap[idef.produces] ?? 200
    city.inventory[idef.produces] = Math.min(max, stock + idef.producesPerDay)
    ind.operational = true
  }
}

export function applyDay(state: GameState): void {
  for (const city of Object.values(state.cities)) {
    const def = CITY_BY_ID[city.id]
    if (!def) continue
    applyProduction(state, city, def)
    applyConsumption(state, city, def)
    dayCheckCrisis(state, city, def)
  }
  repairSegments(state)
  state.stats.populationSupported = totalPopulation(state)
}

export function applyConsumptionDays(state: GameState, days: number): void {
  for (let i = 0; i < days; i++) {
    state.minutes += 1440
    applyDay(state)
  }
}

export function dayCheckCrisis(state: GameState, city: CityState, def: (typeof CITY_BY_ID)[string]): void {
  for (const kind of ['food', 'medicine', 'fuel'] as CargoId[]) {
    const dl = daysLeft(city, kind)
    if (dl === null) continue
    const exists = state.contracts.some(
      (c) => c.type === 'emergency' && c.to === city.id && c.cargo.some((l) => l.kind === kind) && !c.expired,
    )
    if (dl <= BALANCE.emergencyThresholdDays && !exists) {
      const id = `ec-${state.eventCounter++}`
      const tons = Math.max(18, Math.ceil((def.consumePerDay[kind] ?? 0) * BALANCE.destabilizationDelayDays))
      state.contracts.push({
        id,
        from: emergencySource(state, city.id),
        to: city.id,
        title: `Emergency: ${kind.charAt(0).toUpperCase() + kind.slice(1)} to ${def.name}`,
        cargo: [{ kind, tons }],
        passengers: 0,
        reward: Math.round(tons * CargoPrice(kind) * 2.6),
        reputationReward: 40,
        deadlineAt: state.minutes + BALANCE.destabilizationDelayDays * 1440,
        type: 'emergency',
        riskLabel: 'medium',
        expired: false,
      })
      state.stats.emergencyContracts += 1
      addNotification(
        state,
        'danger',
        `${def.name} is running out of ${kind}`,
        `Only ${Math.ceil(dl)} days of ${kind} remaining. An emergency contract is open.`,
        true,
      )
    } else if (dl <= BALANCE.warningThresholdDays && !exists) {
      addNotification(
        state,
        'warning',
        `${def.name}: ${kind} running low`,
        `${Math.ceil(dl)} days of ${kind} left. Delivery needed soon.`,
        false,
      )
    }
  }
}

function emergencySource(state: GameState, toId: string): string {
  const others = Object.values(state.cities).filter((c) => c.id !== toId)
  const byLevel = [...others].sort((a, b) => b.level - a.level)
  return byLevel[0]?.id ?? 'new-lyon'
}

export function CargoPrice(kind: CargoId): number {
  return CARGO[kind].basePrice
}

function totalPopulation(state: GameState): number {
  return Object.values(state.cities).reduce((sum, c) => sum + c.population, 0)
}

export function applyWeek(state: GameState): void {
  const weekly = weeklyFleetCost(state)
  state.credits -= weekly
  addNotification(state, 'info', 'Weekly costs', `Fleet wages and upkeep: ${fmtMoney(weekly)}.`, false)
  dayCheckContractsExpiringSoon(state)
  decayTrack(state)
}

export function weeklyFleetCost(state: GameState): number {
  let sum = 0
  for (const t of state.trains) {
    sum += BALANCE.wagePerTrainDay * 7
    const stats = computeTrainStats(state, t)
    sum += stats.maintenancePerDay * 7
  }
  for (const c of Object.values(state.cities)) {
    for (const b of c.builds) {
      const upkeep = BUILDS[b.kind] ? Math.round(BUILDS[b.kind].cost * 0.004) : 0
      sum += upkeep
    }
  }
  sum += state.stats.securityInvestment * 0.002
  return sum
}

function decayTrack(state: GameState): void {
  for (const seg of Object.values(state.segments)) {
    if (seg.traffic > 0) {
      seg.quality = Math.max(0.25, seg.quality - 0.004 * seg.traffic)
      seg.traffic = 0
    }
  }
}

function dayCheckContractsExpiringSoon(state: GameState): void {
  const soon = state.contracts.filter(
    (c) => !c.expired && !c.warned && c.deadlineAt - state.minutes < 1440 * 2,
  )
  for (const c of soon) {
    c.warned = true
    addNotification(state, 'warning', `Contract deadline close`, `"${c.title}" expires soon.`, false)
  }
}

export function applyMonth(state: GameState): void {
  for (const city of Object.values(state.cities)) {
    const def = CITY_BY_ID[city.id]
    if (!def) continue
    let growth = 0.004
    if (city.level >= 3) growth += 0.004
    if (city.builds.some((b) => b.kind === 'housing')) growth += 0.006
    if (city.builds.some((b) => b.kind === 'water-treatment')) growth += 0.003
    if (city.builds.some((b) => b.kind === 'hospital')) growth += 0.003
    const starved = ['food', 'medicine', 'fuel'].some((k) => (daysLeft(city, k as CargoId) ?? 9) < 3)
    if (starved) growth -= 0.012
    if (growth >= 0) {
      city.population = Math.max(def.population * 0.5, Math.round(city.population * (1 + growth)))
    } else {
      city.population = Math.max(500, Math.round(city.population * (1 + growth)))
    }
  }
  state.stats.populationSupported = totalPopulation(state)
  tickInfluence(state)
}

function tickInfluence(state: GameState): void {
  for (const city of Object.values(state.cities)) {
    const def = CITY_BY_ID[city.id]
    if (!def) continue
    const target = def.influence + 18
    city.influence = Math.min(100, Math.round(city.influence + (target - city.influence) * 0.06))
  }
  state.influenceTotal = Object.values(state.cities).reduce((s, c) => s + c.influence, 0)
}

export function applyYear(state: GameState): void {
  if (state.mode === 'freeplay') {
    state.freeplayStart = state.freeplayStart ?? state.minutes
    state.threatLevel = 1 + Math.floor(yearOf(state.minutes) - yearOf(state.freeplayStart)) * BALANCE.freeplayThreatGrowth
    state.stats.freeplayYears += 1
  }
  pullMilestones(state)
  grantAchievements(state)
}

function yearOf(minutes: number): number {
  return Math.floor(minutes / 525600) + 1
}

export function pullMilestones(state: GameState): void {
  const checks: { id: string; label: string; done: () => boolean; value?: () => number }[] = [
    { id: 'first-contract', label: 'First contract completed', done: () => state.stats.contractsCompleted >= 1 },
    { id: 'first-industry', label: 'First industry restored', done: () => state.stats.industriesRestored >= 1 },
    { id: 'ton-k', label: '10,000 tons transported', done: () => state.stats.cargoTons >= 10000, value: () => state.stats.cargoTons },
    { id: 'cities-10', label: '10 cities connected', done: () => state.stats.citiesConnected >= 10, value: () => state.stats.citiesConnected },
    { id: 'loop-started', label: 'Great Loop construction started', done: () => state.loop.started, value: () => Object.keys(state.loop.segments).length },
    { id: 'loop-done', label: 'Great Loop completed', done: () => Boolean(state.loop.completeAt) },
  ]
  for (const check of checks) {
    const exists = state.milestones.some((m) => m.id === check.id)
    if (!exists && check.done()) {
      state.milestones.push({ id: check.id, at: state.minutes, label: check.label, value: check.value?.() })
    }
  }
  checkAchievementsUnlocked(state)
}

export function grantAchievements(state: GameState): void {
  checkAchievementsUnlocked(state)
}

export function checkAchievementsUnlocked(state: GameState): void {
  const defs: [string, () => boolean][] = [
    ['first-journey', () => state.stats.contractsCompleted >= 1],
    ['iron-road', () => state.stats.cargoTons >= 1000],
    ['people-mover', () => state.stats.passengers >= 1000],
    ['industrialist', () => state.stats.industriesRestored >= 1],
    ['safe-passage', () => state.stats.banditAttacksSurvived >= 10],
    ['regional-power', () => state.stats.citiesConnected >= 10],
    ['civilization-builder', () => state.stats.populationSupported >= 1000000],
    ['the-great-loop', () => Boolean(state.loop.completeAt)],
    ['second-chance', () => state.prestigeHistory.length >= 1],
    ['eternal-rail', () => state.stats.freeplayYears >= 20],
  ]
  for (const [id, check] of defs) {
    if (check() && !state.achievements.includes(id)) {
      state.achievements.push(id)
      addNotification(state, 'success', 'Achievement unlocked', id, false)
    }
  }
}

export function reputationLabel(score: number): string {
  for (let i = REPUTATION_ORDER.length - 1; i >= 0; i--) {
    if (score >= REPUTATION_SCORE[REPUTATION_ORDER[i]]) return REPUTATION_ORDER[i]
  }
  return 'hostile'
}

export function fmtMoney(v: number): string {
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}k`
  return `${sign}$${Math.round(abs)}`
}