import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/init'
import { applyCompletedConstructions, startConstruction } from '../src/game/cities'

describe('cities', () => {
  it('startConstruction deducts credits and schedules a project', () => {
    const g = createNewGame({ seed: 21 })
    const c0 = g.credits
    const r = startConstruction(g, 'new-lyon', 'sawmill')
    expect(r.ok).toBe(true)
    expect(g.credits).toBeLessThan(c0)
    const c = g.cities['new-lyon'].constructions[0]
    expect(c.kind).toBe('sawmill')
    expect(c.finishAt).toBeGreaterThan(g.minutes)
    expect(c.applied).toBe(false)
  })

  it('rejects construction without funds', () => {
    const g = createNewGame({ seed: 21 })
    g.credits = 100
    const r = startConstruction(g, 'new-lyon', 'steel-mill')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/credits/)
  })

  it('rejects duplicate projects already underway', () => {
    const g = createNewGame({ seed: 21 })
    startConstruction(g, 'new-lyon', 'sawmill')
    const r2 = startConstruction(g, 'new-lyon', 'sawmill')
    expect(r2.ok).toBe(false)
  })

  it('applyCompletedConstructions brings an industry online', () => {
    const g = createNewGame({ seed: 21 })
    g.cities['new-lyon'].constructions.push({
      id: 'bc-x',
      cityId: 'new-lyon',
      kind: 'sawmill',
      name: 'Sawmill',
      cost: 18000,
      startAt: 0,
      finishAt: 0,
      applied: false,
    })
    g.minutes = 1
    const before = g.stats.industriesRestored
    applyCompletedConstructions(g)
    const saw = g.cities['new-lyon'].industries.find((i) => i.kind === 'sawmill')
    expect(saw?.operational).toBe(true)
    expect(g.stats.industriesRestored).toBe(before + 1)
  })
})