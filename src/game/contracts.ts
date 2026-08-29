import { CargoPrice } from './economy'
import { findPath } from './network'
import { CITY_BY_ID } from './world'
import { rngBetween, rngInt, rngPick, type Rng } from './rng'
import { BALANCE } from './balance'
import type { CargoId, CargoLoad, ContractState, GameState } from './types'
import type { TrainStats } from './trains'

export interface ProfitEstimate {
  revenue: number
  fuel: number
  maintenance: number
  wages: number
  security: number
  riskPenalty: number
  profit: number
}

export function estimateProfit(state: GameState, contract: ContractState, stats: TrainStats, km: number): ProfitEstimate {
  const fuelPrice = contract.type === 'emergency' ? CARGO_EMERGENCY_FUEL_PRICE : 12
  const fuel = km * stats.fuelRatePerKm * fuelPrice
  const maintenance = stats.maintenancePerDay * (km / Math.max(10, stats.speedKmh)) * 0.5
  const wages = BALANCE.wagePerTrainDay * (km / Math.max(10, stats.speedKmh))
  const securityCost = (stats.security + state.perks.securityBonus > 0 ? stats.security : 0) * km * 0.02 * BALANCE.guardCostPerPoint
  const riskFactor = contractRiskFactor(contract.deadlineAt - state.minutes, contract.riskLabel)
  const riskPenalty = contract.reward * riskFactor * 0.12
  const profit = contract.reward - fuel - maintenance - wages - securityCost - riskPenalty
  return { revenue: contract.reward, fuel, maintenance, wages, security: securityCost, riskPenalty, profit }
}

const CARGO_EMERGENCY_FUEL_PRICE = 9

export function contractRiskFactor(deadlineMinutes: number, label: ContractState['riskLabel']): number {
  const base = label === 'low' ? 0.5 : label === 'high' ? 1 : 0.75
  if (deadlineMinutes < 2 * 1440) return base + 0.4
  if (deadlineMinutes < 3 * 1440) return base + 0.2
  return base
}

export function generateContractsForCity(state: GameState, cityId: string, rng: Rng, count = 3): void {
  const def = CITY_BY_ID[cityId]
  if (!def) return
  const existing = state.contracts.filter((c) => c.from === cityId && !c.expired).length
  const target = count + (def.level >= 4 ? 2 : 0)
  for (let i = existing; i < target; i++) {
    if (state.contracts.filter((c) => c.from === cityId && !c.expired).length >= 8) break
    const contract = buildContract(state, cityId, rng)
    if (contract) state.contracts.push(contract)
  }
}

function buildContract(state: GameState, cityId: string, rng: Rng): ContractState | null {
  const def = CITY_BY_ID[cityId]
  const candidates = Object.values(state.cities).filter((c) => {
    if (c.id === cityId) return false
    const path = findPath(state, cityId, c.id)
    if (!path.ok) return false
    const needs = CITY_BY_ID[c.id]?.needs ?? []
    const producedKinds = def.produces.filter((k) => needs.includes(k as CargoId))
    return producedKinds.length > 0
  })
  if (candidates.length === 0) return null

  const to = rngPick(rng, candidates)
  const toDef = CITY_BY_ID[to.id]
  const path = findPath(state, cityId, to.id)
  const producedKinds = (def.produces as CargoId[]).filter((k) => (toDef.needs as CargoId[]).includes(k))

  const passengerContract = rng() < 0.3 && cityLevelHasPassengers(def.level) && state.stats.contractsCompleted >= 2
  let cargo: CargoLoad[] = []
  let passengers = 0
  if (passengerContract) {
    passengers = to.population > 50000 ? rngInt(rng, 60, 140) : rngInt(rng, 24, 60)
    cargo = [{ kind: producedKinds[0], tons: rngInt(rng, 10, 22) }]
  } else {
    const kind = rngPick(rng, producedKinds)
    const tons = rngInt(rng, 14, 55)
    cargo = [{ kind, tons }]
  }
  const combined = rng() < 0.15 && passengerContract
  if (combined) passengers = rngInt(rng, 24, 60)

  const km = path.km
  const baseDays = km / 55 + 0.7
  const deadlineDays = Math.max(2, Math.round(baseDays + rngBetween(rng, 0.4, 1.8)))
  const deadlineAt = state.minutes + deadlineDays * 1440

  const cargoValue = cargo.reduce((s, c) => s + c.tons * CargoPrice(c.kind), 0)
  const passengerValue = passengers * 38
  const baseReward = (cargoValue + passengerValue) * (1 + km / 2200) + 900
  const repMult = 1 + (def.reputation === 'friendly' || def.reputation === 'allied' ? 0.08 : 0)
  const reward = Math.round((baseReward * repMult) / 100) * 100

  const type = combined || (passengerContract && cargo.length > 0) ? 'combined' : passengerContract ? 'passenger' : 'freight'
  const riskLabel = contractRiskLabelFromThreat(path.regionThreat, state.threatLevel)

  return {
    id: `c-${state.eventCounter++}`,
    from: cityId,
    to: to.id,
    title: `${toDef.name} delivery`,
    cargo,
    passengers,
    reward,
    reputationReward: Math.round(10 + km / 60 + def.level * 3),
    deadlineAt,
    type,
    riskLabel,
    expired: false,
  }
}

function cityLevelHasPassengers(level: number): boolean {
  return level >= 2
}

function contractRiskLabelFromThreat(threat: number, threatLevel: number): ContractState['riskLabel'] {
  const t = threat * (1 + threatLevel * 0.08)
  if (t < 0.14) return 'low'
  if (t < 0.3) return 'medium'
  return 'high'
}

export function expireContracts(state: GameState): void {
  for (const c of state.contracts) {
    if (c.expired) continue
    if (state.minutes >= c.deadlineAt) {
      c.expired = true
      state.stats.contractsFailed += 1
      state.reputation = Math.max(0, state.reputation - 4)
    }
  }
}

export function contractsFor(state: GameState, cityId: string): ContractState[] {
  return state.contracts.filter((c) => c.from === cityId && !c.expired)
}

export function contractById(state: GameState, id: string): ContractState | undefined {
  return state.contracts.find((c) => c.id === id)
}