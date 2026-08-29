import { BALANCE } from './balance'
import { LOCOMOTIVES, WAGONS } from './catalogs'
import type { CargoId, CargoLoad, GameState, TrainState, WagonDef, WagonId } from './types'
import type { TechPerks } from './types'

export interface TrainStats {
  power: number
  speedKmh: number
  weight: number
  cargoCap: Partial<Record<CargoId, number>>
  passengerCap: number
  fuelCap: number
  fuelRatePerKm: number
  security: number
  armor: number
  maintenancePerDay: number
  rangeKm: number
}

function applyPerks(base: number, perk: TechPerks, key: keyof TechPerks): number {
  return base * (1 + (perk[key] as number))
}

export function computeTrainStats(state: GameState, train: TrainState): TrainStats {
  const loco = LOCOMOTIVES[train.locoId]
  const perks = state.perks

  let weight = loco.weight
  let power = loco.power
  let fuelCap = loco.fuelCap
  let fuelRate = loco.fuelRate
  let passengerCap = 0
  let security = 0
  let armor = 0
  let maintenance = loco.maintenancePerDay
  const cargoCap: Partial<Record<CargoId, number>> = {}

  for (const w of train.wagons) {
    const def = WAGONS[w.defId]
    if (!def) continue
    weight += def.weight
    passengerCap += def.passengerSeats
    if (def.cargoCap) {
      const kinds = def.allows ?? GENERIC_FREIGHT_KINDS
      for (const kind of kinds) {
        cargoCap[kind] = (cargoCap[kind] ?? 0) + def.cargoCap
      }
    }
    if (def.fuelBonus) fuelCap += def.fuelBonus
    fuelRate *= def.fuelImpact
    security += def.armor > 0 ? 2 : 0
    armor += def.armor
    maintenance += def.maintenancePerDay
  }

  power = applyPerks(power, perks, 'powerBonus')
  const baseSpeed = applyPerks(loco.speed, perks, 'speedBonus')
  const weightFactor = weight / BALANCE.refWeight
  const loadFactor = Math.min(1.1, Math.max(0.7, Math.pow(weight / 120, -0.18)))
  const speedKmh = baseSpeed * loadFactor
  const fuelRatePerKm = applyPerks(fuelRate, perks, 'fuelEfficiency') * (0.55 + 0.45 * weightFactor)
  const rangeKm = (fuelCap / Math.max(0.01, fuelRatePerKm)) * (1 + perks.rangeBonus)

  return {
    power,
    speedKmh: Math.round(speedKmh * 10) / 10,
    weight: Math.round(weight),
    cargoCap,
    passengerCap,
    fuelCap,
    fuelRatePerKm,
    security: security + (perks.securityBonus > 0 ? 1 : 0),
    armor,
    maintenancePerDay: maintenance * (1 - perks.maintenanceReduction),
    rangeKm: Math.round(rangeKm),
  }
}

const GENERIC_FREIGHT_KINDS: CargoId[] = ['food', 'medicine', 'fuel', 'coal', 'ore', 'timber', 'steel', 'machinery', 'chemicals', 'goods']

export interface TrainCheck {
  ok: boolean
  errors: string[]
  stats: TrainStats
  pullRatio: number
}

export function validateTrain(state: GameState, train: TrainState, cargo: CargoLoad[], passengers: number): TrainCheck {
  const stats = computeTrainStats(state, train)
  const errors: string[] = []
  if (train.wagons.length > BALANCE.maxTrainWagons) errors.push('Too many wagons in the consist.')

  let loadWeight = 0
  for (const c of cargo) {
    const cap = stats.cargoCap[c.kind] ?? 0
    if (c.tons > cap) errors.push(`Too little ${c.kind} capacity for ${c.tons}t.`)
    loadWeight += c.tons
  }
  if (passengers > stats.passengerCap) errors.push(`Only ${stats.passengerCap} passenger seats for ${passengers} passengers.`)
  loadWeight += passengers * 0.1

  const totalWeight = stats.weight + loadWeight
  const pullRatio = stats.power * BALANCE.weightPerPower / totalWeight
  if (pullRatio < 1) errors.push(`The locomotive cannot pull ${Math.round(totalWeight)}t. ${Math.round(stats.power * BALANCE.weightPerPower)}t is the limit.`)

  return { ok: errors.length === 0, errors, stats, pullRatio }
}

export function renameTrain(state: GameState, trainId: string, name: string): GameState {
  const train = state.trains.find((t) => t.id === trainId)
  if (!train) return state
  train.name = name.slice(0, 28)
  return state
}

export function wagonUnlocked(state: GameState, def: WagonDef): boolean {
  const done = state.stats.contractsCompleted
  if (def.unlockContracts !== undefined && done < def.unlockContracts) return false
  if (def.techRequired && !(state.research.completed as string[]).includes(def.techRequired)) return false
  return true
}

export function buyWagon(state: GameState, wagonId: string): GameState {
  const def = WAGONS[wagonId]
  if (!def) return state
  if (!wagonUnlocked(state, def)) return state
  if (state.credits < def.cost) return state
  state.credits -= def.cost
  state.fleet.push({ defId: wagonId as WagonId, condition: 100 })
  return state
}

export function attachWagon(state: GameState, trainId: string, wagonId: string): GameState {
  const train = state.trains.find((t) => t.id === trainId)
  if (!train || train.status !== 'yard') return state
  if (train.wagons.length >= BALANCE.maxTrainWagons) return state
  const idx = state.fleet.findIndex((w) => w.defId === wagonId)
  if (idx < 0) return state
  train.wagons.push(...state.fleet.splice(idx, 1))
  return state
}

export function detachWagon(state: GameState, trainId: string, index: number): GameState {
  const train = state.trains.find((t) => t.id === trainId)
  if (!train || train.status !== 'yard') return state
  if (index < 0 || index >= train.wagons.length) return state
  state.fleet.push(...train.wagons.splice(index, 1))
  return state
}

export function sellWagon(state: GameState, wagonId: string): GameState {
  const def = WAGONS[wagonId]
  if (!def) return state
  const idx = state.fleet.findIndex((w) => w.defId === wagonId)
  if (idx < 0) return state
  state.fleet.splice(idx, 1)
  state.credits += Math.round(def.cost * 0.55)
  return state
}

export function trainById(state: GameState, id: string): TrainState | undefined {
  return state.trains.find((t) => t.id === id)
}

export function fleetCountByType(state: GameState): Partial<Record<WagonId, number>> {
  const out: Partial<Record<WagonId, number>> = {}
  for (const w of state.fleet) out[w.defId] = (out[w.defId] ?? 0) + 1
  return out
}

export const WAGON_UNLOCK_ORDER: WagonId[] = [
  'boxcar',
  'flatbed',
  'passenger-car',
  'tanker',
  'livestock-car',
  'reefer',
  'heavy-cargo',
  'armored-car',
  'fuel-wagon',
]