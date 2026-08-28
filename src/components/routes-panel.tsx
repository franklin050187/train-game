'use client'

import type { GameState } from '@/game/types'
import { CITY } from './game-data'
import { fmtMoney } from '@/game/economy'
import { findPath } from '@/game/network'
import { useSubmit } from './use-submit'
import { addRouteAction, routeChoiceAction } from '@/lib/actions'

export function RoutesPanel({ state }: { state: GameState }) {
  const add = useSubmit(addRouteAction)
  const choice = useSubmit(routeChoiceAction)
  const routes = state.routes

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">New recurring route</h2>
        <form onSubmit={add.submit} className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <select name="from" defaultValue="new-lyon" className="rounded border border-zinc-700 bg-zinc-900 px-2 py-2 outline-none focus:border-amber-500">
            {Object.values(CITY).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select name="to" defaultValue="" required className="rounded border border-zinc-700 bg-zinc-900 px-2 py-2 outline-none focus:border-amber-500">
            <option value="" disabled>Destination…</option>
            {Object.values(CITY).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            name="tons"
            type="number"
            min={10}
            step={10}
            defaultValue={50}
            required
            placeholder="Tons (10–200)"
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-2 outline-none focus:border-amber-500"
          />
          <input
            name="trainsPerWeek"
            type="number"
            min={1}
            max={7}
            defaultValue={2}
            required
            placeholder="Trips/week"
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-2 outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={add.busy}
            className="col-span-2 rounded-lg bg-amber-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-30 sm:col-span-4"
          >
            Open the line
          </button>
        </form>
        {add.err && <p className="mt-2 text-sm text-red-400">{add.err}</p>}
      </section>

      {routes.map((r) => {
        const conn = findPath(state, r.from, r.to).ok
        return (
          <section key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{r.name ?? `${r.from} ⇄ ${r.to}`}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {CITY[r.from]?.name} → {CITY[r.to]?.name} • {r.trainsPerWeek} trips/wk •{' '}
                  {r.cargo.map((g) => `${g.tons}t ${g.kind}`).join(', ')}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className={`font-bold ${r.weeklyRevenue - r.weeklyCosts >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtMoney(r.weeklyRevenue - r.weeklyCosts)}/wk
                </p>
                <p className="text-xs text-zinc-500">{fmtMoney(r.weeklyRevenue)} − {fmtMoney(r.weeklyCosts)}</p>
              </div>
            </div>
            {!conn && <p className="mt-2 text-xs text-red-400">Line is not open — trains cannot run this route.</p>}
            {r.status === 'disrupted' && (
              <form onSubmit={choice.submit} className="mt-3 flex items-center gap-2 rounded-lg border border-amber-700/40 bg-amber-950/20 p-2 text-xs">
                <input type="hidden" name="routeId" value={r.id} />
                <span className="text-amber-300">
                  Disrupted: {r.disruptionNote ?? 'route blocked'} ({r.disruptions} disruptions so far).
                </span>
                <button type="submit" name="choice" value="repair" className="rounded bg-amber-500 px-2 py-1 font-medium text-zinc-950 disabled:opacity-50" disabled={choice.busy}>
                  Pay to fix
                </button>
                <button type="submit" name="choice" value="pause" className="rounded border border-zinc-600 px-2 py-1 text-zinc-200 disabled:opacity-50" disabled={choice.busy}>
                  Pause it
                </button>
              </form>
            )}
            {r.status === 'paused' && (
              <form onSubmit={choice.submit} className="mt-2 flex items-center gap-2 text-xs">
                <input type="hidden" name="routeId" value={r.id} />
                <button type="submit" name="choice" value="resume" className="rounded border border-zinc-600 px-2 py-1 text-zinc-200 disabled:opacity-50" disabled={choice.busy}>
                  Resume
                </button>
              </form>
            )}
          </section>
        );
      })}
      {state.routes.length === 0 && (
        <p className="text-sm text-zinc-500">
          No recurring routes. They pay weekly no matter what — only the disruption events need your attention.
        </p>
      )}
    </div>
  );
}