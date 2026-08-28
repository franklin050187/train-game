export const MINUTES_PER_HOUR = 60
export const HOURS_PER_DAY = 24
export const DAYS_PER_WEEK = 7
export const DAYS_PER_MONTH = 30
export const DAYS_PER_YEAR = 365
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY
export const MINUTES_PER_WEEK = MINUTES_PER_DAY * DAYS_PER_WEEK
export const MINUTES_PER_MONTH = MINUTES_PER_DAY * DAYS_PER_MONTH
export const MINUTES_PER_YEAR = MINUTES_PER_DAY * DAYS_PER_YEAR

export interface TimeParts {
  year: number
  day: number
  hour: number
  minute: number
}

export function splitTime(minutes: number): TimeParts {
  const year = Math.floor(minutes / MINUTES_PER_YEAR) + 1
  const inYear = minutes % MINUTES_PER_YEAR
  const day = Math.floor(inYear / MINUTES_PER_DAY) + 1
  const inDay = inYear % MINUTES_PER_DAY
  const hour = Math.floor(inDay / MINUTES_PER_HOUR)
  const minute = inDay % MINUTES_PER_HOUR
  return { year, day, hour, minute }
}

export function fmtClock(minutes: number): string {
  const t = splitTime(minutes)
  return `${t.year} · day ${t.day} · ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
}

export function fmtShort(minutes: number): string {
  const t = splitTime(minutes)
  return `day ${t.day}`
}

export function fmtHm(minutes: number): string {
  const t = splitTime(minutes)
  return `${t.day}d ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
}

export function dayOf(minutes: number): number {
  return Math.floor(minutes / MINUTES_PER_DAY)
}

export function startOfDay(minutes: number): number {
  return dayOf(minutes) * MINUTES_PER_DAY
}

export function durationFmt(minutes: number): string {
  const d = Math.floor(minutes / MINUTES_PER_DAY)
  const h = Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
  const m = minutes % MINUTES_PER_HOUR
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}