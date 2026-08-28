'use client'

import { useState } from 'react'
import type { GameState } from '@/game/types'
import { WORLD, CITY, LEVELS, BUILD_DEFS } from './game-data'
import { fmtMoney } from '@/game/economy'
import { cityLevelWithBuilds } from '@/game/cities'
import { useSubmit } from './use-submit'
import { buildAction } from '@/lib/actions'

type CityDef = (typeof WORLD)[number]

export function CitiesPanel({ state }: { state: GameState }) {
  const [selId, setSelId] = useState<string>('new-lyon')
  const build = useSubmit(buildAction)
  const sel = state.cities[selId]
  const def = CITY[selId]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {WORLD.map((c: CityDef) => {
          const cs = state.cities[c.id]
          const lvl = cityLevelWithBuilds(cs)
          return (
            <button
              key={c.id}
              onClick={() => setSelId(c.id)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                selId === c.id ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
              }`}
            >
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-zinc-500">
                Lv {lvl} • {cs.population.toLocaleString()} • {cs.reputation}
              </p>
            </button>
          );
        })}
      </div>

      {sel && def && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-lg font-bold">{def.name}</h2>
          <p className="text-xs text-zinc-500">
            Influence {Math.round(sel.influence)} • Security {Math.round(sel.securityLevel * 100)}% • Supply{' '}
            {sel.supply}
          </p>

          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Warehouse</p>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {Object.entries(sel.inventory).map(([k, v]) => (
                <span key={k} className="rounded bg-zinc-800 px-1.5 py-0.5">
                  {k} {v as number}
                </span>
              ))}
              {Object.keys(sel.inventory).length === 0 && <span className="text-zinc-600">Empty</span>}
            </div>
          </div>

          {sel.industries.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">Industry</p>
              <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
                {sel.industries.map((ind) => (
                  <li key={ind.kind} className={`rounded px-1.5 py-0.5 ${ind.operational ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>
                    {ind.kind} Lv{ind.level} {ind.operational ? '' : '(idle)'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sel.constructions.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">In construction</p>
              <ul className="mt-1 space-y-1 text-sm">
                {sel.constructions.map((co) => {
                  const pct = Math.min(100, ((state.minutes - co.startAt) / (co.finishAt - co.startAt)) * 100)
                  return (
                    <li key={co.id} className="flex items-center gap-2">
                      <span className="w-32">{co.name}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500">{Math.round(pct)}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Buildings</p>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {sel.builds.map((b) => (
                <span key={b.kind} className="rounded bg-zinc-800 px-1.5 py-0.5">
                  {BUILD_DEFS[b.kind]?.name ?? b.kind} Lv{b.level}
                </span>
              ))}
              {sel.builds.length === 0 && <span className="text-zinc-600">None yet</span>}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Construct</p>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(BUILD_DEFS).map(([kind, b]) => (
                <form key={kind} onSubmit={build.submit} className="contents">
                  <input type="hidden" name="cityId" value={selId} />
                  <input type="hidden" name="kind" value={kind} />
                  <button
                    type="submit"
                    disabled={build.busy}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-left text-xs hover:border-amber-500 disabled:opacity-40"
                  >
                    <span className="block font-medium text-zinc-200">{b.name}</span>
                    <span className="block text-zinc-500">{fmtMoney(b.cost)}</span>
                    <span className="block truncate text-zinc-600">{b.effects}</span>
                  </button>
                </form>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              Next rank: {LEVELS.find((l) => l.level === cityLevelWithBuilds(sel) + 1)?.name ?? 'max'}
            </p>
          </div>
          {build.err && <p className="mt-2 text-sm text-red-400">{build.err}</p>}
        </section>
      )}
    </div>
  );
}