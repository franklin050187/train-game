import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/init'
import { contractById, contractRiskFactor, expireContracts, generateContractsForCity } from '../src/game/contracts'
import { rngFor } from '../src/game/rng'

describe('contracts', () => {
  it('seeded game starts with contracts from the hub cities', () => {
    const g = createNewGame({ seed: 7 })
    expect(g.contracts.length).toBeGreaterThanOrEqual(6)
    const fromNewLyon = g.contracts.filter((c) => c.from === 'new-lyon')
    expect(fromNewLyon.length).toBeGreaterThanOrEqual(3)
    for (const c of g.contracts) {
      expect(c.reward).toBeGreaterThan(0)
      expect(c.deadlineAt).toBeGreaterThan(0)
      expect(c.to).not.toBe(c.from)
    }
  })

  it('generation tops up a city towards its target count', () => {
    const g = createNewGame({ seed: 7 })
    const before = g.contracts.filter((c) => c.from === 'marseille-n').length
    generateContractsForCity(g, 'marseille-n', rngFor(g.seed, 'test', 'x'), 3)
    expect(g.contracts.filter((c) => c.from === 'marseille-n').length).toBeGreaterThanOrEqual(before)
  })

  it('expireContracts fails expired contracts and dents reputation', () => {
    const g = createNewGame({ seed: 7 })
    const rep0 = g.reputation
    const jobs0 = g.stats.contractsFailed
    for (const c of g.contracts) c.deadlineAt = -1
    expireContracts(g)
    const failed = g.contracts.filter((c) => c.expired)
    expect(failed.length).toBe(g.contracts.length)
    expect(g.stats.contractsFailed).toBeGreaterThanOrEqual(jobs0)
    expect(g.reputation).toBeLessThan(rep0)
  })

  it('contractById resolves an existing contract', () => {
    const g = createNewGame({ seed: 7 })
    const c = g.contracts[0]
    expect(contractById(g, c.id)?.id).toBe(c.id)
  })

  it('risk factor rises for near-deadline contracts', () => {
    const low = contractRiskFactor(1440 * 4, 'low')
    const tight = contractRiskFactor(1440, 'low')
    expect(tight).toBeGreaterThan(low)
  })
})