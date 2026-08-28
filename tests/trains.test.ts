import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/init'
import { addWagon, computeTrainStats, removeWagon, renameTrain, validateTrain } from '../src/game/trains'
import { dispatchTrain } from '../src/game/journeys'
import { findPath } from '../src/game/network'

describe('trains', () => {
  it('computes baseline stats for the starter engine', () => {
    const g = createNewGame({ seed: 42 })
    const stats = computeTrainStats(g, g.trains[0])
    expect(stats.weight).toBeGreaterThan(60)
    expect(stats.speedKmh).toBeGreaterThan(0)
    expect(stats.fuelRatePerKm).toBeGreaterThan(0)
    expect(stats.rangeKm).toBeGreaterThan(100)
    expect(stats.cargoCap.food).toBe(92) // flatbed 50 + boxcar 42
    expect(stats.cargoCap.machinery).toBe(92)
  })

  it('validates capacity shortfalls', () => {
    const g = createNewGame({ seed: 42 })
    const check = validateTrain(g, g.trains[0], [{ kind: 'ore', tons: 500 }], 0)
    expect(check.ok).toBe(false)
    expect(check.errors.join()).toMatch(/ore/)
  })

  it('validates passenger shortfalls', () => {
    const g = createNewGame({ seed: 42 })
    const check = validateTrain(g, g.trains[0], [], 200)
    expect(check.ok).toBe(false)
    expect(check.errors.join()).toMatch(/passenger/)
  })

  it('addWagon refuses when train is in transit or broke', () => {
    const g = createNewGame({ seed: 42 })
    g.credits = 10
    const before = g.trains[0].wagons.length
    const r1 = addWagon(g, 'tr-1', 'boxcar')
    expect(r1).toBe(g)
    expect(g.trains[0].wagons.length).toBe(before)

    g.credits = 100000
    g.trains[0].status = 'transit'
    addWagon(g, 'tr-1', 'boxcar')
    expect(g.trains[0].wagons.length).toBe(before)
  })

  it('addWagon spends credits and refunds on removal', () => {
    const g = createNewGame({ seed: 42 })
    g.credits = 100000
    const c0 = g.credits
    addWagon(g, 'tr-1', 'boxcar')
    expect(g.credits).toBeLessThan(c0)
    expect(g.trains[0].wagons.length).toBe(3)
    removeWagon(g, 'tr-1', 2)
    expect(g.trains[0].wagons.length).toBe(2)
    expect(g.credits).toBe(c0 - 9800 + Math.round(9800 * 0.55))
  })

  it('renameTrain trims to 28 chars', () => {
    const g = createNewGame({ seed: 42 })
    renameTrain(g, 'tr-1', 'A'.repeat(50))
    expect(g.trains[0].name.length).toBe(28)
  })

  it('blocked dispatch needs an open path and a yard train', () => {
    const g = createNewGame({ seed: 42 })
    const r1 = dispatchTrain(g, 'tr-1', 'no-such-contract')
    expect(r1.ok).toBe(false)
    expect(r1.error).toMatch(/contract/i)
  })

  it('pathfinder returns a valid path across the seeded map', () => {
    const g = createNewGame({ seed: 42 })
    const p = findPath(g, 'new-lyon', 'paris-valo')
    expect(p.ok).toBe(true)
    expect(p.path[0]).toBe('new-lyon')
    expect(p.path[p.path.length - 1]).toBe('paris-valo')
    expect(p.km).toBeGreaterThan(0)
    expect(p.segments.length).toBeGreaterThan(0)
    expect(p.avgQuality).toBeGreaterThan(0)
  })
})