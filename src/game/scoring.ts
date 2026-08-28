import { SCORING } from './balance'
import type { GameState } from './types'

export interface ScoreBreakdown {
  profit: number
  revenue: number
  cities: number
  industries: number
  railway: number
  contracts: number
  reliability: number
  loop: number
  freeplay: number
  total: number
}

export function computeScore(state: GameState): ScoreBreakdown {
  const totalJobs = state.stats.contractsCompleted + state.stats.contractsFailed
  const reliability = totalJobs > 0 ? state.stats.contractsCompleted / totalJobs : 1
  const reliabilityBonus = reliability >= 0.98 && totalJobs >= 3 ? SCORING.reliabilityBonus : 0
  const loopBonus = state.loop.completeAt ? SCORING.loopCompletion : 0
  const freeplayYears = state.freeplayStart ? (state.minutes - state.freeplayStart) / (365 * 1440) : 0

  const profit = Math.round(state.stats.totalProfit * SCORING.profitPerPoint)
  const revenue = Math.round(state.stats.totalRevenue * SCORING.revenuePerPoint)
  const cities = Math.round(state.stats.citiesConnected * SCORING.cityPerPoint)
  const industries = Math.round(state.stats.industriesRestored * SCORING.industryPerPoint)
  const railway = Math.round(state.stats.railwayKmBuilt * SCORING.railwayPerPoint)
  const contracts = Math.round(state.stats.contractsCompleted * SCORING.contractPerPoint) - Math.round(state.stats.contractsFailed * SCORING.failedPenalty)
  const loop = loopBonus
  const freeplay = Math.round(freeplayYears * SCORING.freeplayYearPerPoint)

  const total = Math.max(0, profit + revenue + cities + industries + railway + contracts + Math.round(reliabilityBonus) + loop + freeplay)
  return { profit, revenue, cities, industries, railway, contracts, reliability: Math.round(reliability * 100), loop, freeplay, total }
}

export interface TimelineEntry {
  day: number
  label: string
}

export function buildTimeline(state: GameState): TimelineEntry[] {
  return state.milestones.map((m) => ({ day: Math.floor(m.at / 1440), label: m.label }))
}