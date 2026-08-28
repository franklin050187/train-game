import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/init'
import { CITY_BY_ID } from '../src/game/world'
import {
  CargoPrice,
  applyConsumptionDays,
  applyDay,
  applyWeek,
  checkAchievementsUnlocked,
  daysLeft,
  dayCheckCrisis,
  fmtMoney,
} from '../src/game/economy'

describe('economy', () => {
  it('prices cargo from the catalog', () => {
    expect(CargoPrice('medicine')).toBeGreaterThan(CargoPrice('food'))
    expect(CargoPrice('fuel')).toBe(220)
  })

  it('fmtMoney compresses large values', () => {
    expect(fmtMoney(1234)).toBe('$1k')
    expect(fmtMoney(0)).toBe('$0')
    expect(fmtMoney(1_250_000)).toBe('$1.25M')
  })

  it('applyDay consumes inventory toward need', () => {
    const g = createNewGame({ seed: 5 })
    const lyon = g.cities['new-lyon']
    const fuelBefore = lyon.inventory.fuel
    g.minutes = 1440
    applyDay(g)
    expect((lyon.inventory.fuel ?? 0)).toBeLessThanOrEqual(fuelBefore ?? 0)
  })

  it('applyWeek charges weekly fleet costs', () => {
    const g = createNewGame({ seed: 5 })
    const c0 = g.credits
    g.minutes = 7 * 1440
    applyWeek(g)
    expect(g.credits).toBeLessThan(c0)
  })

  it('daysLeft returns days of stock and null for unneeded cargo', () => {
    const g = createNewGame({ seed: 5 })
    const lyon = g.cities['new-lyon']
    expect(daysLeft(lyon, 'food')).not.toBeNull()
    expect(daysLeft(lyon, 'ore')).toBeNull()
  })

it('dayCheckCrisis opens emergency contracts when stock is critical', () => {
    const g = createNewGame({ seed: 5 })
    g.cities['toulouse-c'].inventory.fuel = 1
    const before = g.contracts.length
    dayCheckCrisis(g, g.cities['toulouse-c'], CITY_BY_ID['toulouse-c'])
    const emergency = g.contracts.filter((c) => c.type === 'emergency')
    expect(emergency.length).toBeGreaterThan(0)
    expect(g.contracts.length).toBeGreaterThan(before)
    expect(g.stats.emergencyContracts).toBeGreaterThanOrEqual(1)
  })

  it('achievements unlock on first successful delivery state', () => {
    const g = createNewGame({ seed: 5 })
    g.stats.contractsCompleted = 1
    g.stats.totalProfit = 50000
    checkAchievementsUnlocked(g)
    expect(g.achievements.length).toBeGreaterThan(0)
  })
})

describe('economy helpers', () => {
  it('applyConsumptionDays reduces supply over a span', () => {
    const g = createNewGame({ seed: 5 })
    applyConsumptionDays(g, 3)
    expect(g.cities['new-lyon'].supply).toBeLessThanOrEqual(100)
  })
})