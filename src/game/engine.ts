import { dayOf, startOfDay } from './time'
import { pendingJourneys, journeyOf, triggerEncounter, arriveJourney, nextEventTimeFor } from './journeys'
import { applyCompletedConstructions } from './cities'
import { applyDay, applyWeek, applyMonth, applyYear } from './economy'
import { checkCompletedResearch, nextResearchFinish } from './research'
import { tickRoutes, nextRouteEvent } from './routes'
import { expireContracts } from './contracts'
import type { GameState } from './types'

export type AdvanceMode = 'next-event' | 'minutes' | 'hours' | 'days'

export type StopReason = 'decision' | 'event' | 'target'

export interface AdvanceResult {
  state: GameState
  stopped: StopReason
  processed: number
  target: number
}

interface Candidate {
  time: number
  kind: 'train' | 'construction' | 'research' | 'route' | 'contract'
  journeyId?: string
}

export function advanceTime(state: GameState, mode: AdvanceMode, amount = 1): AdvanceResult {
  const target = targetTime(state, mode, amount)
  if (target <= state.minutes) return { state, stopped: 'target', processed: 0, target: state.minutes }
  if (hasAwaitingDecision(state)) return { state, stopped: 'decision', processed: 0, target: state.minutes }

  let processed = 0
  let guard = 0
  while (state.minutes < target && guard++ < 100000) {
    if (hasAwaitingDecision(state)) break
    const nextDay = startOfDay(state.minutes) + 1440
    const horizon = Math.min(nextDay, target)
    const cand = nextCandidate(state, horizon)

    if (!cand) {
      state.minutes = horizon
      if (horizon === nextDay) {
        applyDay(state)
        applyBoundaryHooks(state)
        processed++
      }
      if (mode === 'next-event' && processed >= 1) break
      continue
    }

    const stopAt = Math.min(cand.time, target)
    while (state.minutes < stopAt) {
      const nd = startOfDay(state.minutes) + 1440
      if (nd <= stopAt) {
        state.minutes = nd
        applyDay(state)
        applyBoundaryHooks(state)
      } else {
        state.minutes = stopAt
      }
    }

    if (cand.time <= state.minutes && cand.time <= target) {
      processCandidate(state, cand)
      processed++
    }
    if (hasAwaitingDecision(state)) break
    if (mode === 'next-event' && processed >= 1) break
  }

  if (hasAwaitingDecision(state)) {
    return { state, stopped: 'decision', processed, target: state.minutes }
  }
  return { state, stopped: mode === 'next-event' && processed >= 1 ? 'event' : 'target', processed, target: state.minutes }
}

function targetTime(state: GameState, mode: AdvanceMode, amount: number): number {
  switch (mode) {
    case 'minutes':
      return state.minutes + amount
    case 'hours':
      return state.minutes + amount * 60
    case 'days': {
      const target = state.minutes + amount * 1440
      return target
    }
    case 'next-event': {
      const next = previewNextEvent(state)
      return next ? next.time : startOfDay(state.minutes) + 1440
    }
  }
}

function hasAwaitingDecision(state: GameState): boolean {
  return pendingJourneys(state).some((j) => j.status === 'awaiting-decision')
}

function nextCandidate(state: GameState, horizon: number): Candidate | undefined {
  let best: Candidate | undefined
  const consider = (c: Candidate) => {
    if (c.time <= horizon && (!best || c.time < best.time)) best = c
  }

  for (const t of state.trains) {
    const j = t.journey
    if (!j) continue
    if (j.status === 'failed' || j.status === 'lost') continue
    consider({ time: nextEventTimeFor(state, j), kind: 'train', journeyId: j.id })
  }

  for (const city of Object.values(state.cities)) {
    for (const c of city.constructions) {
      if (!c.applied) consider({ time: c.finishAt, kind: 'construction' })
    }
  }

  const researchFinish = nextResearchFinish(state)
  if (researchFinish !== undefined) consider({ time: researchFinish, kind: 'research' })

  const routeEvent = nextRouteEvent(state)
  if (routeEvent !== undefined) consider({ time: routeEvent, kind: 'route' })

  for (const c of state.contracts) {
    if (!c.expired) consider({ time: c.deadlineAt, kind: 'contract' })
  }

  return best
}

function processCandidate(state: GameState, cand: Candidate): void {
  switch (cand.kind) {
    case 'train': {
      const j = journeyOf(state, cand.journeyId!)
      if (!j) return
      if (j.status === 'awaiting-decision') return
      const enc = j.encounters.find((e) => !e.resolved && e.atMinutes <= state.minutes)
      if (enc) {
        triggerEncounter(state, j)
      } else {
        arriveJourney(state, j.id)
      }
      break
    }
    case 'construction':
      applyCompletedConstructions(state)
      break
    case 'research':
      checkCompletedResearch(state)
      break
    case 'route':
      tickRoutes(state)
      break
    case 'contract':
      expireContracts(state)
      break
  }
}

function applyBoundaryHooks(state: GameState): void {
  const d = dayOf(state.minutes)
  if (d % 7 === 0) applyWeek(state)
  if (d % 30 === 0) applyMonth(state)
  if (d % 365 === 0) applyYear(state)
}

export interface NextEventPreview {
  time: number
  kind: Candidate['kind']
  journeyId?: string
}

export function previewNextEvent(state: GameState): NextEventPreview | undefined {
  const horizon = startOfDay(state.minutes) + 1440 * 365
  const cand = nextCandidate(state, horizon)
  if (!cand) return undefined
  return { time: cand.time, kind: cand.kind, journeyId: cand.journeyId }
}