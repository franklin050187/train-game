import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/init'
import { attachWagon, buyWagon, computeTrainStats, detachWagon, renameTrain, sellWagon, validateTrain, wagonUnlocked } from '../src/game/trains'
import { dispatchTrain } from '../src/game/journeys'
import { findPath } from '../src/game/network'
import { WAGONS } from '../src/game/catalogs'

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

  it('wagonUnlocked gates by completed contracts and research', () => {
    const g = createNewGame({ seed: 42 })
    expect(wagonUnlocked(g, WAGONS.boxcar)).toBe(true)
    g.stats.contractsCompleted = 1
    expect(wagonUnlocked(g, WAGONS.tanker)).toBe(false)
    g.stats.contractsCompleted = 2
    expect(wagonUnlocked(g, WAGONS.tanker)).toBe(true)
    expect(wagonUnlocked(g, WAGONS['fuel-wagon'])).toBe(false)
    g.stats.contractsCompleted = 8
    g.research.completed.push('fw-tank')
    expect(wagonUnlocked(g, WAGONS['fuel-wagon'])).toBe(true)
  })

  it('buyWagon adds to fleet; attach/detach never destroys a wagon', () => {
    const g = createNewGame({ seed: 42 })
    g.credits = 100000
    const c0 = g.credits
    buyWagon(g, 'boxcar')
    expect(g.credits).toBe(c0 - 9800)
    expect(g.fleet).toHaveLength(1)
    expect(g.trains[0].wagons.length).toBe(2)

    attachWagon(g, 'tr-1', 'boxcar')
    expect(g.fleet).toHaveLength(0)
    expect(g.trains[0].wagons.length).toBe(3)

    detachWagon(g, 'tr-1', 2)
    expect(g.trains[0].wagons.length).toBe(2)
    expect(g.fleet).toHaveLength(1)
    expect(g.credits).toBe(c0 - 9800)

    sellWagon(g, 'boxcar')
    expect(g.fleet).toHaveLength(0)
    expect(g.credits).toBe(c0 - 9800 + Math.round(9800 * 0.55))
  })

  it('attach refuses while train is in transit or train is full', () => {
    const g = createNewGame({ seed: 42 })
    g.credits = 100000
    buyWagon(g, 'boxcar')
    g.trains[0].status = 'transit'
    attachWagon(g, 'tr-1', 'boxcar')
    expect(g.fleet).toHaveLength(1)
    g.trains[0].status = 'yard'
    for (let i = 0; i < 6; i++) buyWagon(g, 'boxcar')
    expect(g.fleet).toHaveLength(7)
    for (let i = 0; i < 10; i++) attachWagon(g, 'tr-1', 'boxcar')
    expect(g.trains[0].wagons.length).toBe(8)
    expect(g.fleet).toHaveLength(1)
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