import { generateContractsForCity } from './contracts'
import { BALANCE } from './balance'
import { rngChance, rngBetween, rngFor } from './rng'
import { CITY_BY_ID } from './world'
import { computeTrainStats, validateTrain, trainById } from './trains'
import { addNotification, checkAchievementsUnlocked, pullMilestones } from './economy'
import { findPath, neighbors } from './network'
import { generateEncounters } from './bandits'
import type { GameState, Journey, ReputationLevel } from './types'

export interface DispatchResult {
  ok: boolean
  error?: string
  journeyId?: string
}

export function dispatchTrain(state: GameState, trainId: string, contractId: string): DispatchResult {
  const train = trainById(state, trainId)
  if (!train) return { ok: false, error: 'Train not found.' }
  if (train.status !== 'yard') return { ok: false, error: `${train.name} is not in the yard.` }
  const contract = state.contracts.find((c) => c.id === contractId)
  if (!contract) return { ok: false, error: 'Contract not found.' }
  if (contract.expired) return { ok: false, error: 'Contract already expired.' }

  const stats = computeTrainStats(state, train)
  const check = validateTrain(state, train, contract.cargo, contract.passengers)
  if (!check.ok) return { ok: false, error: check.errors[0] }
  const path = findPath(state, contract.from, contract.to)
  if (!path.ok) return { ok: false, error: 'No usable line connects these cities.' }

  const qualityFactor = 0.85 + 0.3 * path.avgQuality
  const travelMin = (path.km / (stats.speedKmh * qualityFactor)) * 60
  const arrivalAt = state.minutes + Math.round(travelMin)
  const fuelLiters = path.km * stats.fuelRatePerKm
  const fuelCost = Math.round(fuelLiters * 12)
  if (state.credits < fuelCost) {
    return { ok: false, error: `Not enough credits for fuel (${fuelCost}).` }
  }
  state.credits -= fuelCost

  state.eventCounter += 1
  const journeyId = `j-${state.eventCounter}`
  const rng = rngFor(state.seed, 'journey', journeyId)

  const journey: Journey = {
    id: journeyId,
    trainId,
    contractId,
    kind: 'contract',
    from: contract.from,
    to: contract.to,
    dispatchAt: state.minutes,
    distanceKm: path.km,
    speedMod: 1,
    cargo: contract.cargo,
    passengers: contract.passengers,
    reward: contract.reward,
    reputationReward: contract.reputationReward,
    deadlineAt: contract.deadlineAt,
    arrivalAt,
    encounterSeq: 0,
    encounters: [],
    status: 'enroute',
    damageTaken: 0,
    guardsSpent: 0,
    fuelUnitsUsed: fuelLiters,
    armor: stats.armor,
    security: stats.security,
    fuelCost,
  }
  journey.encounters = generateEncounters(state, journey, rng, path.regionThreat)

  for (const segId of path.segments) {
    const s = state.segments[segId]
    if (s) s.traffic += 1
  }

  train.status = 'transit'
  train.journey = journey
  state.stats.trainsOperated += 1

  const dest = CITY_BY_ID[contract.to]?.name ?? contract.to
  addNotification(
    state,
    'info',
    `${train.name} dispatched`,
    `Bound for ${dest} with ${contract.cargo.map((c) => `${c.tons}t ${c.kind}`).join(', ') || `${contract.passengers} passengers`}. Arrives in ~${Math.round(travelMin / 60)}h.`,
  )
  return { ok: true, journeyId }
}

export function journeyOf(state: GameState, journeyId: string): Journey | undefined {
  for (const t of state.trains) {
    if (t.journey?.id === journeyId) return t.journey
  }
  return undefined
}

export function pendingJourneys(state: GameState): Journey[] {
  const out: Journey[] = []
  for (const t of state.trains) {
    if (t.journey && !out.some((j) => j.id === t.journey!.id)) {
      if (t.journey.status === 'enroute' || t.journey.status === 'awaiting-decision') out.push(t.journey)
    }
  }
  return out
}

export function nextEventTimeFor(state: GameState, j: Journey): number {
  if (j.status === 'awaiting-decision') return state.minutes
  const enc = j.encounters.find((e) => !e.resolved && e.atMinutes >= state.minutes)
  if (enc) return Math.min(enc.atMinutes, j.arrivalAt)
  return j.arrivalAt
}

export function nextTrainEvent(state: GameState): { time: number; journey: Journey } | undefined {
  let best: { time: number; journey: Journey } | undefined
  for (const t of state.trains) {
    const j = t.journey
    if (!j) continue
    if (j.status === 'failed' || j.status === 'lost') continue
    const time = nextEventTimeFor(state, j)
    if (!best || time < best.time) best = { time, journey: j }
  }
  return best
}

export function resolveEncounter(state: GameState, journeyId: string, optionId: string): boolean {
  const journey = journeyOf(state, journeyId)
  if (!journey || journey.status !== 'awaiting-decision') return false
  const enc = journey.encounters.find((e) => !e.resolved)
  if (!enc) return false
  const option = enc.options.find((o) => o.id === optionId)
  if (!option) return false
  if (option.cost && state.credits < option.cost) return false
  if (option.cost) {
    state.credits -= option.cost
    journey.guardsSpent += option.cost
  }

  const travelLeft = Math.max(0, journey.arrivalAt - state.minutes)
  const speedFactor = option.effects.speed ?? 1
  const delay = (option.effects.delayHours ?? 0) * 60
  journey.arrivalAt = Math.round(state.minutes + travelLeft / speedFactor + delay)

  const threat = enc.threat * (option.effects.threat ?? 1)
  const damageMult = option.effects.damage ?? 1
  const successChance = Math.min(0.95, Math.max(0.15, 0.42 + journey.security * 0.03 + (journey.armor / 30) * 0.1 + (option.cost ? 0.3 : 0) - threat * 1.1))
  const rng = rngFor(state.seed, 'resolve', `${journey.id}:${enc.id}:${option.id}`)
  enc.resolved = true
  enc.note = option.label

  if (rngChance(rng, successChance)) {
    journey.damageTaken += Math.round(rngBetween(rng, 4, 16) * damageMult)
    journey.status = 'enroute'
    state.stats.banditAttacksSurvived += 1
    addNotification(state, 'success', enc.title, `Repelled cleanly. ${option.label}.`)
    return true
  }

  const severe = enc.kind === 'bandit-ambush' || enc.kind === 'bandit-raider'
  if (severe && rngChance(rng, Math.max(0.02, 0.25 * threat * 1.4 - journey.security * 0.1))) {
    journey.status = 'lost'
    journey.result = `Cargo lost to raiders near ${CITY_BY_ID[journey.from]?.name ?? journey.from}.`
    const contract = state.contracts.find((c) => c.id === journey.contractId)
    if (contract) contract.expired = true
    destroyTrain(state, journey)
    state.reputation = Math.max(0, state.reputation - 14)
    addNotification(state, 'danger', enc.title, journey.result, true)
    return true
  }

  journey.damageTaken += Math.round(rngBetween(rng, 12, 38) * damageMult)
  journey.status = 'enroute'
  state.stats.banditAttacksSurvived += 1
  addNotification(state, 'warning', enc.title, `Fought through. ${option.label}. ${journey.damageTaken}% damage taken.`)
  return true
}

function destroyTrain(state: GameState, journey: Journey): void {
  const idx = state.trains.findIndex((t) => t.id === journey.trainId)
  if (idx >= 0) state.trains.splice(idx, 1)
}

export function triggerEncounter(state: GameState, journey: Journey): void {
  const enc = journey.encounters.find((e) => !e.resolved && e.atMinutes <= state.minutes)
  if (!enc) return
  journey.status = 'awaiting-decision'
  addNotification(state, 'warning', enc.title, enc.text, true)
}

export function arriveJourney(state: GameState, journeyId: string): void {
  const journey = journeyOf(state, journeyId)
  if (!journey || journey.status !== 'enroute') return
  if (state.minutes < journey.arrivalAt) return

  const deadlineMinutes = journey.deadlineAt
  let reward = journey.reward
  let repGain = journey.reputationReward
  let contractFailed = false

  if (state.minutes - deadlineMinutes > 2 * 1440) {
    reward = 0
    repGain = -12
    contractFailed = true
    state.stats.contractsFailed += 1
  } else if (state.minutes > deadlineMinutes) {
    reward = Math.round(journey.reward * 0.55)
    repGain = Math.round(repGain * 0.4) - 6
  }

  state.credits += reward
  state.reputation = Math.max(0, state.reputation + repGain)
  matchReputationToCities(state)

  const tons = journey.cargo.reduce((s, c) => s + c.tons, 0)
  const repairCost = Math.round(journey.damageTaken * BALANCE.repairCostPerDamage)
  state.stats.totalRevenue += reward
  state.stats.totalProfit += reward - journey.fuelCost - journey.guardsSpent - repairCost
  state.stats.repairsSpent += repairCost
  state.stats.cargoTons += tons
  state.stats.passengers += journey.passengers
  if (reward > 0) state.stats.contractsCompleted += 1

  const contract = state.contracts.find((c) => c.id === journey.contractId)
  if (contract) {
    if (contractFailed) {
      contract.expired = true
    } else {
      contract.fulfilled = true
    }
  }

  const city = state.cities[journey.to]
  if (city && !contractFailed) {
    const def = CITY_BY_ID[journey.to]
    for (const c of journey.cargo) {
      const cap = def?.storageCap[c.kind] ?? 300
      city.inventory[c.kind] = Math.min(cap, (city.inventory[c.kind] ?? 0) + c.tons)
    }
  }

  const train = trainById(state, journey.trainId)
  if (train) {
    train.status = 'yard'
    train.location = journey.to
    train.journey = undefined
    for (const w of train.wagons) {
      w.condition = Math.max(40, w.condition - Math.round((journey.distanceKm / 3000) * 14 + journey.damageTaken / 8))
    }

    // Fog of war: reveal destination city and connected segments
    if (!state.revealedCities.includes(journey.to)) {
      state.revealedCities.push(journey.to)
      const conns = neighbors(journey.to)
      for (const n of conns) {
        if (!state.revealedCities.includes(n.city)) {
          state.revealedCities.push(n.city)
        }
        if (!state.revealedSegments.includes(n.seg)) {
          state.revealedSegments.push(n.seg)
        }
      }
      // Generate contracts for newly revealed city
      const rng = rngFor(state.seed, 'contracts', journey.to)
      generateContractsForCity(state, journey.to, rng, 2)
    }
  }

  const dest = CITY_BY_ID[journey.to]?.name ?? journey.to
  if (reward > 0) {
    addNotification(state, 'success', `${dest}: delivery complete`, `+${reward.toLocaleString()} credits. ${tons}t delivered.`)
  } else if (contractFailed) {
    addNotification(state, 'danger', `${dest}: contract failed`, 'Journey arrived far past the deadline. No payment.', true)
  }
  pullMilestones(state)
  checkAchievementsUnlocked(state)
}

function matchReputationToCities(state: GameState): void {
  const label = cityRepFromScore(state.reputation)
  for (const city of Object.values(state.cities)) {
    city.reputation = label
  }
}

function cityRepFromScore(score: number): ReputationLevel {
  if (score >= 110) return 'strategic-partner'
  if (score >= 75) return 'allied'
  if (score >= 45) return 'friendly'
  if (score >= 20) return 'cooperative'
  if (score >= 0) return 'neutral'
  return 'hostile'
}