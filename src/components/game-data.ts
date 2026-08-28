import { CITIES, CITY_BY_ID, SEGMENTS } from '@/game/world'
import { LOCOMOTIVES, WAGONS, TECH, BUILDS, REPUTATION_SCORE, REPUTATION_ORDER } from '@/game/catalogs'
import { BALANCE } from '@/game/balance'
import { CITY_LEVELS } from '@/game/catalogs'

export const WORLD = CITIES
export const CITY = CITY_BY_ID
export const SEGMENT_LIST = SEGMENTS
export const LOCOS = LOCOMOTIVES
export const WAGON_DEFS = WAGONS
export const TECHS = TECH
export const BUILD_DEFS = BUILDS
export const REP_SCORE = REPUTATION_SCORE
export const REP_ORDER = REPUTATION_ORDER
export const LEVELS = CITY_LEVELS
export const BAL = BALANCE
export { REPUTATION_SCORE, REPUTATION_ORDER, CITY_LEVELS }

export function cityById(id: string) {
  return CITY_BY_ID[id]
}

export function mapBounds() {
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9
  for (const c of CITIES) {
    minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x)
    minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y)
  }
  const pad = 4
  return { minX: minX - pad, minY: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
}