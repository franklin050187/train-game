import { TECH } from './catalogs'
import { addNotification, checkAchievementsUnlocked } from './economy'
import type { GameState, TechId, TechPerks } from './types'

export type ResearchStatus = 'completed' | 'running' | 'available' | 'locked'

export interface ResearchResult {
  ok: boolean
  error?: string
}

export function startResearch(state: GameState, techId: TechId, pointsSpent = 0): ResearchResult {
  const tech = TECH[techId]
  if (!tech) return { ok: false, error: 'Unknown technology.' }
  if (state.research.completed.includes(techId)) return { ok: false, error: 'Already researched.' }
  if (state.research.progress.some((p) => p.techId === techId)) return { ok: false, error: 'Already in progress.' }
  const locked = tech.requires?.some((r) => !state.research.completed.includes(r))
  if (locked) {
    const missing = tech.requires!.filter((r) => !state.research.completed.includes(r))
    return { ok: false, error: `Requires: ${missing.map((r) => TECH[r]?.name ?? r).join(', ')}.` }
  }
  const cost = Math.max(0, tech.cost - pointsSpent * 2500)
  if (state.credits < cost) return { ok: false, error: `Not enough credits (${cost}).` }

  state.credits -= cost
  state.eventCounter += 1
  state.research.progress.push({
    techId,
    remainingDays: tech.timeDays,
    finishAt: state.minutes + tech.timeDays * 1440,
  })
  state.research.points = Math.max(0, state.research.points - pointsSpent)
  addNotification(state, 'info', `Research started: ${tech.name}`, `Completes in ${tech.timeDays} days.`, false)
  return { ok: true }
}

export function researchStatus(state: GameState, techId: TechId): ResearchStatus {
  const tech = TECH[techId]
  if (!tech) return 'locked'
  if (state.research.completed.includes(techId)) return 'completed'
  if (state.research.progress.some((p) => p.techId === techId)) return 'running'
  if (tech.requires?.some((r) => !state.research.completed.includes(r))) return 'locked'
  return 'available'
}

export function checkCompletedResearch(state: GameState): void {
  const done = state.research.progress.filter((p) => p.finishAt <= state.minutes)
  if (done.length === 0) return
  for (const p of done) {
    state.research.progress = state.research.progress.filter((x) => x.techId !== p.techId)
    if (state.research.completed.includes(p.techId)) continue
    state.research.completed.push(p.techId)
    const tech = TECH[p.techId]
    if (tech?.perk) applyPerks(state, tech.perk)
    state.stats.researchCompleted += 1
    addNotification(state, 'success', `Research complete: ${tech?.name ?? p.techId}`, 'Perks applied to your network.', false)
  }
  checkAchievementsUnlocked(state)
}

function applyPerks(state: GameState, perk: Partial<TechPerks>): void {
  for (const [k, v] of Object.entries(perk)) {
    if (typeof v === 'number') {
      (state.perks as unknown as Record<string, number>)[k] =
        ((state.perks as unknown as Record<string, number>)[k] ?? 0) + v
    }
  }
}

export function nextResearchFinish(state: GameState): number | undefined {
  const times = state.research.progress.map((p) => p.finishAt).filter((t) => t >= state.minutes)
  return times.length ? Math.min(...times) : undefined
}