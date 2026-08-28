import { CARGO } from './types'
import { CITY_BY_ID } from './world'
import { rngChance, rngFor } from './rng'
import { addNotification } from './economy'
import { findPath } from './network'
import type { GameState, RecurringRouteState } from './types'

export interface RouteResult {
  ok: boolean
  error?: string
}

const MAX_ROUTES = 4

export function createRecurringRoute(state: GameState, from: string, to: string, tons: number, trainsPerWeek: number): RouteResult {
  if (state.routes.length >= MAX_ROUTES) return { ok: false, error: 'Too many routes (max 4).' }
  const src = CITY_BY_ID[from]
  const dst = CITY_BY_ID[to]
  if (!src || !dst) return { ok: false, error: 'City not found.' }
  if (from === to) return { ok: false, error: 'Route must connect two different cities.' }
  if (tons <= 0 || tons > 300) return { ok: false, error: 'Tonnage per run must be between 1 and 300.' }
  if (trainsPerWeek < 1 || trainsPerWeek > 14) return { ok: false, error: 'Trains per week must be between 1 and 14.' }
  const path = findPath(state, from, to)
  if (!path.ok) return { ok: false, error: 'No open line between these cities.' }
  if (state.credits < 5000) return { ok: false, error: 'Route setup costs 5,000 credits.' }

  const kind = src.produces[0] ?? 'food'
  const price = CARGO[kind].basePrice
  const weeklyRevenue = Math.round(tons * price * (path.km / 95) * trainsPerWeek * 0.62)
  const weeklyCosts = Math.round(1600 * trainsPerWeek + path.km * 4.5 * trainsPerWeek)

  state.credits -= 5000
  state.eventCounter += 1
  const route: RecurringRouteState = {
    id: `rt-${state.eventCounter}`,
    name: `${src.name} - ${dst.name}`,
    from,
    to,
    cargo: [{ kind, tons }],
    trainsPerWeek,
    weeklyRevenue,
    weeklyCosts,
    nextPayAt: state.minutes + 7 * 1440,
    status: 'active',
    disruptions: 0,
  }
  state.routes.push(route)
  addNotification(state, 'info', `Recurring route opened`, `${route.name}: ~${(weeklyRevenue - weeklyCosts).toLocaleString()} credits/week.`, false)
  return { ok: true }
}

export function tickRoutes(state: GameState): void {
  for (const route of state.routes) {
    if (route.status !== 'active') continue
    if (route.nextPayAt > state.minutes) continue
    const profit = route.weeklyRevenue - route.weeklyCosts
    if (profit > 0) state.credits += profit
    state.stats.totalRevenue += route.weeklyRevenue
    state.stats.totalProfit += profit
    route.nextPayAt += 7 * 1440

    const rng = rngFor(state.seed, 'route', route.id)
    const threat = routeThreat(state, route)
    if (rngChance(rng, Math.min(0.45, threat))) {
      route.status = 'disrupted'
      route.disruptions += 1
      route.disruptionNote = 'Raiders and sabotage have closed this line. Pay to repair or pause it.'
      addNotification(state, 'warning', `${route.name} disrupted`, 'Recurring route halted by bandit activity.', true)
    }
  }
}

export function routeThreat(state: GameState, route: RecurringRouteState): number {
  const defs = [CITY_BY_ID[route.from], CITY_BY_ID[route.to]].filter((d): d is NonNullable<typeof d> => Boolean(d))
  const base = defs.reduce((s, d) => s + (REGION_BASE[d.region] ?? 0.15), 0) / Math.max(1, defs.length)
  const worldFactor = 1 + state.threatLevel * 0.04
  return base * worldFactor * 0.32
}

const REGION_BASE: Record<string, number> = {
  central: 0.16,
  northern: 0.34,
  eastern: 0.1,
  southern: 0.2,
}

export function resolveRouteDisruption(state: GameState, routeId: string, choice: 'repair' | 'pause' | 'resume'): RouteResult {
  const route = state.routes.find((r) => r.id === routeId)
  if (!route) return { ok: false, error: 'Route not found.' }
  if (choice === 'repair') {
    const cost = 4500 + route.disruptions * 1900
    if (state.credits < cost) return { ok: false, error: `Repairs cost ${cost} credits.` }
    state.credits -= cost
    route.status = 'active'
    route.nextPayAt = state.minutes + 7 * 1440
    route.disruptionNote = undefined
    addNotification(state, 'info', `${route.name} repaired`, `Line reopened. ${cost} credits.`, false)
    return { ok: true }
  }
  if (choice === 'pause') {
    route.status = 'paused'
    route.disruptionNote = undefined
    addNotification(state, 'info', `${route.name} paused`, 'No revenue or cost until resumed.', false)
    return { ok: true }
  }
  if (choice === 'resume') {
    route.status = 'active'
    route.nextPayAt = state.minutes + 7 * 1440
    route.disruptionNote = undefined
    addNotification(state, 'info', `${route.name} resumed`, 'Weekly payments resume.', false)
    return { ok: true }
  }
  return { ok: false, error: 'Unknown choice.' }
}

export function nextRouteEvent(state: GameState): number | undefined {
  const times = state.routes
    .filter((r) => r.status === 'active')
    .map((r) => r.nextPayAt)
    .filter((t) => t >= state.minutes)
  return times.length ? Math.min(...times) : undefined
}