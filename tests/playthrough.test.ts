import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/init'
import { advanceTime } from '../src/game/engine'
import { addWagon } from '../src/game/trains'
import { dispatchTrain, pendingJourneys, resolveEncounter } from '../src/game/journeys'
import { createRecurringRoute } from '../src/game/routes'
import { startResearch } from '../src/game/research'
import { computeScore } from '../src/game/scoring'

function play(seed: number) {
  const g = createNewGame({ seed })
  g.credits = 500000
  const tr = g.trains[0]
  tr.locoId = 'heavy-electric'
  for (let i = 0; i < 3; i++) addWagon(g, 'tr-1', 'boxcar')
  createRecurringRoute(g, 'new-lyon', 'marseille-n', 40, 3)

  startResearch(g, 'fw-lightweight')
  g.research.progress[0].finishAt = g.minutes + 5 * 1440

  let guard = 0
  while (g.minutes < 180 * 1440 && guard++ < 4000) {
    const idle = tr.status === 'yard' && !tr.journey
    if (idle) {
      const contract = g.contracts.find((c) => !c.expired && c.passengers === 0)
      if (contract) {
        dispatchTrain(g, 'tr-1', contract.id)
      } else {
        advanceTime(g, 'days', 1)
        continue
      }
    }
    const r = advanceTime(g, 'days', 3)
    if (r.stopped === 'decision') {
      const j = pendingJourneys(g)[0]
      if (j) {
        const enc = j.encounters.find((e) => !e.resolved)
        if (enc) {
          const opt = enc.options.find((o) => o.cost && g.credits >= o.cost) ?? enc.options[0]
          resolveEncounter(g, j.id, opt.id)
        }
      }
    }
  }
  return {
    minutes: g.minutes,
    credits: g.credits,
    completed: g.stats.contractsCompleted,
    failed: g.stats.contractsFailed,
    tons: g.stats.cargoTons,
    research: g.research.completed,
    routes: g.routes.length,
    score: computeScore(g).total,
    notifications: g.notifications.length,
  }
}

describe('playthrough', () => {
  it('a 6-month seeding run moves the system without crashing', () => {
    const out = play(0xbeef)
    expect(out.minutes).toBeGreaterThan(170 * 1440)
    expect(out.completed).toBeGreaterThan(2)
    expect(out.credits).toBeGreaterThan(0)
    expect(out.research).toContain('fw-lightweight')
    expect(out.routes).toBe(1)
  })

  it('is fully deterministic for a fixed seed', () => {
    const a = play(0xbeef)
    const b = play(0xbeef)
    expect(a).toEqual(b)
  })

  it('different seeds diverge', () => {
    const a = play(0xbeef)
    const c = play(0xc0ffee)
    expect(a).not.toEqual(c)
  })
})