import { LOOP_SEGMENT_IDS, SEGMENT_BY_ID } from './world'
import { addNotification, checkAchievementsUnlocked } from './economy'
import { computeScore } from './scoring'
import { createNewGame } from './init'
import type { GameState } from './types'

export interface LoopSegmentInfo {
  segId: string
  name: string
  km: number
  progress: number
  costPerFund: number
  totalCost: number
  complete: boolean
  unlocked: boolean
  unlockReason?: string
}

export function loopSegmentInfo(state: GameState, segId: string): LoopSegmentInfo {
  const def = SEGMENT_BY_ID[segId]
  const progress = state.loop.segments[segId]?.progress ?? 0
  const costPerFund = Math.round(9000 + def.km * 42)
  const totalCost = Math.round(costPerFund * 8)
  const influenceOk = (state.cities[def.a]?.influence ?? 0) >= 30 && (state.cities[def.b]?.influence ?? 0) >= 30
  const securityOk = (state.cities[def.a]?.securityLevel ?? 0) + (state.cities[def.b]?.securityLevel ?? 0) >= 3
  const unlocked = state.loop.started && influenceOk && securityOk
  return {
    segId,
    name: def.loopName ?? def.id,
    km: def.km,
    progress,
    costPerFund,
    totalCost,
    complete: progress >= 1,
    unlocked,
    unlockReason: !state.loop.started
      ? 'Start the Great Loop challenge first.'
      : !influenceOk
        ? `Cities on this line need influence 30+ (currently ${Math.round(state.cities[def.a]?.influence ?? 0)} / ${Math.round(state.cities[def.b]?.influence ?? 0)}).`
        : undefined,
  }
}

export function startLoopChallenge(state: GameState): { ok: boolean; error?: string } {
  if (state.loop.started) return { ok: false, error: 'Great Loop already underway.' }
  if (state.reputation < 80) return { ok: false, error: 'Need reputation 80+ to begin the Great Loop.' }
  state.eventCounter += 1
  state.loop.started = true
  state.loop.segments = {}
  addNotification(state, 'info', 'The Great Loop', 'Factions will fund a full circuit of the map. Repair the six spurs to win the era.', true)
  return { ok: true }
}

export function fundLoopSegment(state: GameState, segId: string, funds = 1): { ok: boolean; error?: string } {
  const info = loopSegmentInfo(state, segId)
  if (!state.loop.segments[segId]) state.loop.segments[segId] = { id: segId, progress: 0 }
  const prog = state.loop.segments[segId]
  if (!info.unlocked) return { ok: false, error: info.unlockReason }
  if (info.complete) return { ok: false, error: 'Already complete.' }
  const cost = info.costPerFund * funds
  if (state.credits < cost) return { ok: false, error: `Need ${cost} credits.` }
  state.credits -= cost
  prog.progress = Math.min(1, prog.progress + 0.125 * funds)
  state.stats.railwayKmBuilt += Math.round(SEGMENT_BY_ID[segId].km * 0.125 * funds)
  if (prog.progress >= 1) {
    addNotification(state, 'success', `${info.name} rebuilt`, 'A spur of the Great Loop is open.', false)
    checkLoopComplete(state)
  } else {
    addNotification(state, 'info', `${info.name}: construction continues`, `${Math.round(prog.progress * 100)}% done.`, false)
  }
  return { ok: true }
}

export function checkLoopComplete(state: GameState): void {
  if (state.loop.completeAt) return
  const completeCount = LOOP_SEGMENT_IDS.filter((id) => (state.loop.segments[id]?.progress ?? 0) >= 1).length
  if (completeCount === LOOP_SEGMENT_IDS.length) {
    state.loop.completeAt = state.minutes
    state.mode = 'freeplay'
    state.freeplayStart = state.minutes
    addNotification(state, 'success', 'The Great Loop is complete', 'Every spur is open. History is written. Freeplay unlocked.', true)
    state.threatLevel = Math.max(state.threatLevel - 4, 1)
    checkAchievementsUnlocked(state)
  }
}

export function enterFreeplay(state: GameState): { ok: boolean; error?: string } {
  if (state.mode === 'freeplay') return { ok: false, error: 'Already in freeplay.' }
  if (!state.loop.completeAt) return { ok: false, error: 'Complete the Great Loop to unlock freeplay.' }
  state.mode = 'freeplay'
  state.freeplayStart = state.minutes
  addNotification(state, 'success', 'Freeplay unlocked', 'The map is yours. Grow until the wasteland grows back. Then prestige.', true)
  return { ok: true }
}

export function prestige(state: GameState, playerName?: string): { ok: boolean; error?: string; newState?: GameState } {
  if (!state.loop.completeAt) return { ok: false, error: 'Complete the Great Loop to prestige.' }
  const score = computeScore(state)
  state.legacy += 1
  state.eventCounter += 1
  state.prestigeHistory.push({
    id: `pg-${state.eventCounter}`,
    at: state.minutes,
    legacy: state.legacy,
    finalScore: score.total,
    summary: `${score.total.toLocaleString()} points, ${state.stats.contractsCompleted} contracts, ${state.stats.cargoTons} tons moved, ${state.stats.industriesRestored} industries restored.`,
  })

  const next = createNewGame({
    seed: state.seed + state.legacy * 9973,
    playerName: playerName ?? state.playerName,
    careerId: state.careerId,
    legacy: state.legacy,
  })
  next.reputation = Math.min(120, Math.round(state.reputation * 0.5 + state.legacy * 5))
  next.credits = Math.round(next.credits * (1 + state.legacy * 0.25))
  next.notifications.unshift({
    id: `pg-${state.eventCounter}`,
    at: next.minutes,
    kind: 'success',
    title: `Prestige ${state.legacy}`,
    body: `New era begun. Legacy ${state.legacy}: +${state.legacy * 25}% starting credits, reputation carryover.`,
    critical: true,
  })
  addNotification(next, 'info', 'The world starts over', 'The rails are quiet again. Rebuild them better.', true)
  return { ok: true, newState: next }
}