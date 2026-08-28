'use client'

import { useMemo, useState } from 'react'
import type { GameState } from '@/game/types'
import { WORLD, SEGMENT_LIST, mapBounds, CITY } from './game-data'
import { findPath, segmentUsable } from '@/game/network'
import { useSubmit } from './use-submit'
import { buildAction } from '@/lib/actions'
import type { Tab } from './game-shell'

const pct = (n: number) => `${Math.round(n * 100)}%`

export function MapPanel({ state, go }: { state: GameState; go: (t: Tab) => void }) {
  const [sel, setSel] = useState<string | null>('new-lyon')
  const [legend, setLegend] = useState(false)
  const bounds = mapBounds()
  const build = useSubmit(buildAction)

  const cityConnect = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const c of WORLD) map[c.id] = findPath(state, 'new-lyon', c.id).ok
    return map
  }, [state])

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`} className="w-full rounded-lg border border-zinc-800 bg-zinc-950">
        {SEGMENT_LIST.map((s) => {
          const a = CITY[s.a]
          const b = CITY[s.b]
          const usable = segmentUsable(state, s.id)
          const segState = state.segments[s.id]
          const threat = segState.securityLevel > 0.2
          return (
            <line
              key={s.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={usable ? (threat ? '#f59e0b' : '#3f6212') : '#27272a'}
              strokeWidth={s.loop ? 2.4 : 1.2}
              strokeDasharray={s.loop ? '2 2' : undefined}
              className={usable ? '' : 'opacity-60'}
            />
          );
        })}
        {WORLD.map((c) => {
          const conn = cityConnect[c.id]
          const isSel = sel === c.id
          const rep = state.cities[c.id]?.reputation
          return (
            <g key={c.id} onClick={() => setSel(c.id)} className="cursor-pointer">
              <circle
                cx={c.x}
                cy={c.y}
                r={isSel ? 3.6 : 2.6}
                fill={conn ? (rep === 'hostile' ? '#dc2626' : rep === 'suspicious' ? '#f59e0b' : '#d4d4d8') : '#52525b'}
                stroke={c.id === 'new-lyon' ? '#fbbf24' : isSel ? '#fff' : '#18181b'}
                strokeWidth={1}
              />
              <text x={c.x} y={c.y - 4} textAnchor="middle" fontSize={3} fill={isSel ? '#fbbf24' : '#a1a1aa'} className="select-none">
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <button onClick={() => setLegend((v) => !v)} className="text-zinc-400 hover:text-zinc-200">
          {legend ? 'Hide legend' : 'Legend'}
        </button>
        <span>{Object.values(cityConnect).filter(Boolean).length} connected cities</span>
      </div>
      {legend && (
        <ul className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#d4d4d8]" /> Connected city</li>
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#52525b]" /> No rail route</li>
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#dc2626]" /> Hostile city</li>
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#fbbf24]" /> Home, New Lyon</li>
          <li><span className="mr-1 inline-block h-0.5 w-4 align-middle bg-[#3f6212]" /> Open line</li>
          <li><span className="mr-1 inline-block h-0.5 w-4 align-middle bg-[#f59e0b]" /> Warned line</li>
          <li><span className="mr-1 inline-block h-0.5 w-4 align-middle bg-[#27272a]" /> Ruined line</li>
        </ul>
      )}

      {sel && <CityCard key={sel} state={state} cityId={sel} build={build} go={go} />}
    </div>
  );
}

function CityCard({
  state,
  cityId,
  build,
  go,
}: {
  state: GameState
  cityId: string
  build: { busy: boolean; err: string | null; submit: (e: React.FormEvent<HTMLFormElement>) => Promise<void> }
  go: (t: Tab) => void
}) {
  const def = CITY[cityId]
  if (!def) return null
  const cs = state.cities[cityId]
  const conn = findPath(state, 'new-lyon', cityId).ok
  const stock = cs.inventory

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{def.name}</h2>
          <p className="text-xs text-zinc-500">
            Level {cs.level} • {cs.population.toLocaleString()} pop • {cs.reputation}
          </p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs ${conn ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
          {conn ? 'On rail' : 'No line'}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Stock</p>
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
          {Object.entries(stock).map(([k, v]) => (
            <span key={k} className="rounded bg-zinc-800 px-1.5 py-0.5">
              {k} {pct((v as number) / (def.storageCap[k as keyof typeof def.storageCap] ?? 1))}
            </span>
          ))}
          {Object.keys(stock).length === 0 && <span className="text-zinc-600">Empty</span>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => go('contracts')}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-amber-500"
        >
          Contracts
        </button>
        <button
          onClick={() => go('cities')}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-amber-500"
        >
          Manage city
        </button>
      </div>

      {!conn && state.loop.started && (
        <form onSubmit={build.submit} className="mt-3 flex items-center gap-2 text-xs">
          <input type="hidden" name="cityId" value={cityId} />
          <input type="hidden" name="kind" value="depot" />
          <button type="submit" disabled={build.busy} className="rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-zinc-950 disabled:opacity-50">
            Build depot
          </button>
          <span className="text-zinc-500">— extend the rail network toward this city</span>
        </form>
      )}
      {build.err && <p className="mt-2 text-sm text-red-400">{build.err}</p>}
    </section>
  );
}