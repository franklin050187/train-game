import { describe, expect, it } from 'vitest'
import { createNewGame } from '../src/game/init'
import { advanceTime } from '../src/game/engine'
import { attachWagon, buyWagon, validateTrain } from '../src/game/trains'
import { dispatchTrain, pendingJourneys, resolveEncounter } from '../src/game/journeys'

function setupRunner() {
  const g = createNewGame({ seed: 99 })
  const tr = g.trains[0]
  tr.locoId = 'diesel-hauler'
  g.credits = 200000
  for (let i = 0; i < 2; i++) {
    buyWagon(g, 'boxcar')
    attachWagon(g, 'tr-1', 'boxcar')
  }
  const cargoTons = (c: { cargo: Array<{ tons: number }> }) => c.cargo.reduce((s, l) => s + l.tons, 0)
  const contract = g.contracts
    .filter((c) => !c.expired && c.passengers === 0)
    .sort((a, b) => cargoTons(a) - cargoTons(b))[0]
  expect(contract).toBeTruthy()
  const check = validateTrain(g, tr, contract!.cargo, 0)
  expect(check.ok).toBe(true)
  return { g, contract: contract! }
}

function runUntilIdle(g: ReturnType<typeof setupRunner>['g'], maxSteps = 80): void {
  for (let i = 0; i < maxSteps; i++) {
    const r = advanceTime(g, 'hours', 6)
    const tr = g.trains[0]
    if (tr.status === 'yard' && !tr.journey) return
    if (r.stopped === 'decision') {
      const j = pendingJourneys(g)[0]
      if (!j) continue
      const enc = j.encounters.find((e) => !e.resolved)
      if (!enc) continue
      const affordable = enc.options.find((o) => o.cost && g.credits >= o.cost) ?? enc.options[0]
      resolveEncounter(g, j.id, affordable.id)
      continue
    }
    if (i === maxSteps - 1) throw new Error('journey never finished')
  }
}

describe('engine', () => {
  it('advances a dispatched journey to a settled arrival', () => {
    const { g, contract } = setupRunner()
    const creditsBefore = g.credits
    const disp = dispatchTrain(g, 'tr-1', contract.id)
    expect(disp.ok).toBe(true)
    const tr = g.trains[0]
    expect(tr.status).toBe('transit')
    expect(g.credits).toBeLessThan(creditsBefore) // fuel prepaid

    runUntilIdle(g)

    expect(tr.status).toBe('yard')
    expect(tr.journey).toBeUndefined()
    expect(tr.location).toBe(contract.to)
    const done = g.contracts.find((c) => c.id === contract.id)
    expect(done?.fulfilled).toBe(true)
    expect(g.stats.contractsCompleted).toBe(1)
    expect(g.stats.cargoTons).toBe(contract.cargo.reduce((s, c) => s + c.tons, 0))
    expect(g.stats.totalRevenue).toBe(contract.reward)
  })

  it('daily economy ticks as time crosses day boundaries', () => {
    const g = createNewGame({ seed: 99 })
    const lyon = g.cities['new-lyon']
    const fuel0 = lyon.inventory.fuel
    const t0 = g.minutes
    advanceTime(g, 'days', 3)
    expect(g.minutes - t0).toBeCloseTo(3 * 1440, 5)
    expect((lyon.inventory.fuel ?? 0)).toBeLessThan(fuel0 ?? 0)
    expect(g.stats.populationSupported).toBeGreaterThan(0)
  })

  it('next-event mode stops after the first consequential event', () => {
    const g = createNewGame({ seed: 99 })
    const t0 = g.minutes
    const r = advanceTime(g, 'next-event')
    expect(t0).toBeLessThanOrEqual(r.state.minutes)
    expect(['event', 'target', 'decision']).toContain(r.stopped)
  })

  it('REFUSES time travel with a negative amount', () => {
    const g = createNewGame({ seed: 99 })
    const r = advanceTime(g, 'minutes', -10)
    expect(r.state.minutes).toBe(0)
  })
})