import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/init'
import { generateEncounters } from '../src/game/bandits'
import { rngFor } from '../src/game/rng'
import type { Journey } from '../src/game/types'

function sampleJourney(): Journey {
  return {
    id: 'j-test',
    trainId: 'tr-1',
    contractId: 'c-1',
    kind: 'contract',
    from: 'new-lyon',
    to: 'marseille-n',
    dispatchAt: 0,
    distanceKm: 88,
    speedMod: 1,
    cargo: [{ kind: 'steel', tons: 30 }],
    passengers: 0,
    reward: 4000,
    reputationReward: 20,
    deadlineAt: 2 * 1440,
    arrivalAt: 3 * 60,
    encounterSeq: 0,
    encounters: [],
    status: 'enroute',
    damageTaken: 0,
    guardsSpent: 0,
    fuelUnitsUsed: 40,
    armor: 0,
    security: 1,
    fuelCost: 480,
  }
}

describe('bandits', () => {
  it('generates at least one structured encounter per journey', () => {
    const g = createNewGame({ seed: 11 })
    const rng = rngFor(g.seed, 't', 'a')
    const encs = generateEncounters(g, sampleJourney(), rng, 0.05)
    expect(encs.length).toBeGreaterThanOrEqual(1)
    for (const e of encs) {
      expect(e.id).toMatch(/j-test-e/)
      expect(e.options.length).toBeGreaterThan(0)
      expect(e.threat).toBeGreaterThan(0)
      expect(e.resolved).toBe(false)
      expect(e.atMinutes).toBeGreaterThan(0)
    }
  })

  it('is deterministic for a given seed and journey', () => {
    const g1 = createNewGame({ seed: 11 })
    const g2 = createNewGame({ seed: 11 })
    const a = generateEncounters(g1, sampleJourney(), rngFor(g1.seed, 't', 'a'), 0.2)
    const b = generateEncounters(g2, sampleJourney(), rngFor(g2.seed, 't', 'a'), 0.2)
    expect(a.map((e) => e.id + e.kind)).toEqual(b.map((e) => e.id + e.kind))
  })

  it('encounters never exceed the journey duration', () => {
    const g = createNewGame({ seed: 11 })
    const j = sampleJourney()
    const encs = generateEncounters(g, j, rngFor(g.seed, 't', 'b'), 0.4)
    for (const e of encs) {
      expect(e.atMinutes).toBeLessThan(j.arrivalAt)
    }
  })
})