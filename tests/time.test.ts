import { describe, expect, it } from 'vitest'
import { MINUTES_PER_DAY, MINUTES_PER_YEAR, dayOf, durationFmt, fmtClock, splitTime, startOfDay } from '../src/game/time'

describe('time', () => {
  it('splits minutes into year/day/hour/minutes', () => {
    const t = splitTime(0)
    expect(t).toEqual({ year: 1, day: 1, hour: 0, minute: 0 })
    const t2 = splitTime(1440 + MINUTES_PER_YEAR)
    expect(t2.day).toBe(2)
    expect(t2.year).toBe(2)
  })

  it('dayOf floors to 24h buckets', () => {
    expect(dayOf(0)).toBe(0)
    expect(dayOf(1440)).toBe(1)
    expect(dayOf(1439)).toBe(0)
    expect(dayOf(2880)).toBe(2)
  })

  it('startOfDay returns the boundary', () => {
    expect(startOfDay(1500)).toBe(1440)
    expect(startOfDay(1440)).toBe(1440)
    expect(startOfDay(MINUTES_PER_DAY * 3 + 7)).toBe(MINUTES_PER_DAY * 3)
  })

  it('fmtClock renders a readable clock', () => {
    expect(fmtClock(0)).toBe('1 · day 1 · 00:00')
  })

  it('durationFmt collapses units', () => {
    expect(durationFmt(30)).toBe('30m')
    expect(durationFmt(90)).toBe('1h 30m')
    expect(durationFmt(1500)).toBe('1d 1h 0m')
  })
})