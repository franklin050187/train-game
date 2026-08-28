import { describe, expect, it } from 'vitest'
import { createNewGame, createDemoGame } from '../src/game/init'
import {
  checkLoopComplete,
  enterFreeplay,
  fundLoopSegment,
  loopSegmentInfo,
  prestige,
  startLoopChallenge,
} from '../src/game/endgame'
import { computeScore } from '../src/game/scoring'
import { startResearch, checkCompletedResearch, researchStatus } from '../src/game/research'
import { createRecurringRoute, tickRoutes, routeThreat } from '../src/game/routes'
import { LOOP_SEGMENT_IDS } from '../src/game/world'

describe('endgame', () => {
  it('loop starts only at high reputation', () => {
    const g = createNewGame({ seed: 3 })
    expect(startLoopChallenge(g).ok).toBe(false)
    g.reputation = 90
    expect(startLoopChallenge(g).ok).toBe(true)
    expect(g.loop.started).toBe(true)
  })

  it('loop segments require city influence to fund', () => {
    const g = createNewGame({ seed: 3 })
    g.reputation = 90
    startLoopChallenge(g)
    const info = loopSegmentInfo(g, LOOP_SEGMENT_IDS[0])
    expect(info.unlocked).toBe(false)
  })

  it('funding every spur completes the loop and unlocks freeplay', () => {
    const g = createNewGame({ seed: 3 })
    g.reputation = 90
    for (const id of ['new-lyon', 'bordeaux-est', 'toulouse-c', 'orleans-sud', 'metz-sud', 'paris-valo']) {
      g.cities[id].influence = 60
      g.cities[id].securityLevel = 3
    }
    startLoopChallenge(g)

    for (const id of LOOP_SEGMENT_IDS) {
      const info = loopSegmentInfo(g, id)
      expect(info.unlocked).toBe(true)
      expect(info.costPerFund).toBeGreaterThan(0)
      for (let f = 0; f < 8; f++) {
        g.credits += 1_000_000
        const r = fundLoopSegment(g, id)
        expect(r.ok).toBe(true)
      }
    }
    checkLoopComplete(g)
    expect(g.loop.completeAt).toBeDefined()
    expect(g.mode).toBe('freeplay')

    const already = enterFreeplay(g)
    expect(already.ok).toBe(false) // already freeplay
  })

  it('prestige banks the score and resets to a new era with legacy', () => {
    const g = createNewGame({ seed: 3 })
    g.reputation = 90
    g.loop.completeAt = 1000
    g.stats.contractsCompleted = 40
    g.stats.totalProfit = 600000
    const r = prestige(g, 'Herald')
    expect(r.ok).toBe(true)
    const next = r.newState!
    expect(next.legacy).toBe(1)
    expect(next.playerName).toBe('Herald')
    expect(next.credits).toBeGreaterThan(createNewGame({ seed: 3 }).credits)
    expect(g.prestigeHistory).toHaveLength(1)
    expect(computeScore(g).total).toBeGreaterThan(0)
  })
})

describe('research', () => {
  it('startResearch requires credits, then completes after time', () => {
    const g = createNewGame({ seed: 3 })
    g.credits = 1_000_000
    const r = startResearch(g, 'fw-lightweight')
    expect(r.ok).toBe(true)
    expect(researchStatus(g, 'fw-lightweight')).toBe('running')
    g.research.progress[0].finishAt = 0
    checkCompletedResearch(g)
    expect(researchStatus(g, 'fw-lightweight')).toBe('completed')
    expect(g.perks.speedBonus).toBe(0.08)
    expect(g.stats.researchCompleted).toBe(1)
  })

  it('prerequisite techs gate progress', () => {
    const g = createNewGame({ seed: 3 })
    g.credits = 1_000_000
    const r = startResearch(g, 'fw-high-capacity')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Requires/)
  })
})

describe('routes', () => {
  it('a recurring route pays weekly and can be disrupted', () => {
    const g = createNewGame({ seed: 3 })
    g.credits = 100_000
    const r = createRecurringRoute(g, 'new-lyon', 'marseille-n', 40, 3)
    expect(r.ok).toBe(true)
    const route = g.routes[0]
    expect(route.weeklyRevenue).toBeGreaterThan(route.weeklyCosts)
    expect(routeThreat(g, route)).toBeGreaterThan(0)
    const c0 = g.credits
    route.nextPayAt = 0
    tickRoutes(g)
    expect(g.credits).toBeGreaterThan(c0)
  })

  it('rejects routes to unreachable cities or duplicate overload', () => {
    const g = createNewGame({ seed: 3 })
    g.credits = 100_000
    const r = createRecurringRoute(g, 'new-lyon', 'toulouse-c', 40, 3)
    expect(r.ok).toBe(true)
    const dupe = createRecurringRoute(g, 'new-lyon', 'toulouse-c', 40, 3)
    expect(dupe.ok).toBe(true) // allowed with separate setup cost
    const bad = createRecurringRoute(g, 'new-lyon', 'new-lyon', 40, 3)
    expect(bad.ok).toBe(false)
  })
})

describe('demo', () => {
  it('createDemoGame builds a richer deterministic state', () => {
    const a = createDemoGame(123)
    const b = createDemoGame(123)
    expect(a.trains.length).toBe(2)
    expect(a.credits).toBe(180000)
    expect(a.research.completed).toContain('fw-lightweight')
    expect(a.seed).toBe(b.seed)
    expect(a.trains[1].name).toBe(b.trains[1].name)
  })
})