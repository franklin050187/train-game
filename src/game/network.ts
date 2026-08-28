import { SEGMENT_BY_ID, WORLD } from './world'
import type { GameState } from './types'

export interface PathResult {
  path: string[]
  segments: string[]
  km: number
  avgQuality: number
  regionThreat: number
  ok: boolean
}

function neighbors(cityId: string) {
  const out: { city: string; seg: string }[] = []
  for (const s of WORLD.segments) {
    if (s.a === cityId) out.push({ city: s.b, seg: s.id })
    else if (s.b === cityId) out.push({ city: s.a, seg: s.id })
  }
  return out
}

export function segmentUsable(state: GameState, segId: string): boolean {
  const def = SEGMENT_BY_ID[segId]
  if (!def) return false
  if (def.loop) {
    const progress = state.loop.segments[segId]?.progress ?? 0
    return progress >= 1
  }
  return true
}

export function findPath(state: GameState, from: string, to: string): PathResult {
  const dist = new Map<string, number>()
  const prev = new Map<string, { city: string; seg: string } | null>()
  const visited = new Set<string>()
  dist.set(from, 0)
  prev.set(from, null)

  const frontier = [from]
  while (frontier.length > 0) {
    frontier.sort((x, y) => (dist.get(x) ?? Infinity) - (dist.get(y) ?? Infinity))
    const cur = frontier.shift()!
    if (cur === to) break
    if (visited.has(cur)) continue
    visited.add(cur)
    const curDist = dist.get(cur) ?? Infinity
    for (const nb of neighbors(cur)) {
      if (visited.has(nb.city)) continue
      if (!segmentUsable(state, nb.seg)) continue
      const def = SEGMENT_BY_ID[nb.seg]
      const segState = state.segments[nb.seg]
      const quality = segState?.quality ?? def.baseQuality
      const weight = def.km / Math.max(0.1, quality)
      const nd = curDist + weight
      if (nd < (dist.get(nb.city) ?? Infinity)) {
        dist.set(nb.city, nd)
        prev.set(nb.city, { city: cur, seg: nb.seg })
        frontier.push(nb.city)
      }
    }
  }
  if (!dist.has(to)) return { path: [], segments: [], km: 0, avgQuality: 0, regionThreat: 0, ok: false }

  const path: string[] = []
  const segs: string[] = []
  let cur: string | undefined = to
  while (cur && prev.has(cur)) {
    path.unshift(cur)
    const p = prev.get(cur)
    if (p) {
      segs.unshift(p.seg)
      cur = p.city
    } else {
      cur = undefined
    }
  }
  let km = 0
  let qualitySum = 0
  let regionThreat = 0
  for (const segId of segs) {
    const def = SEGMENT_BY_ID[segId]
    const segState = state.segments[segId]
    const quality = segState?.quality ?? def.baseQuality
    km += def.km
    qualitySum += quality
    const region = def.region
    const base = WORLD.regions.find((r) => r.id === region)?.banditBaseThreat ?? 0.1
    const securityMult = 1 - Math.min(0.85, (segState?.securityLevel ?? 0) * 0.16)
    regionThreat += def.km * base * securityMult
  }
  return {
    path,
    segments: segs,
    km,
    avgQuality: segs.length ? qualitySum / segs.length : 0.8,
    regionThreat: km > 0 ? regionThreat / km : 0,
    ok: true,
  }
}

export function segmentSecurityLevel(state: GameState, segId: string): number {
  return state.segments[segId]?.securityLevel ?? 0
}