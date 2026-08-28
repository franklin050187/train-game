'use client'

import type { GameState } from '@/game/types'
import { CITY } from './game-data'
import { findPath } from '@/game/network'
import { fmtMoney } from '@/game/economy'
import { durationFmt } from '@/game/time'
import { useSubmit } from './use-submit'
import { dispatchAction } from '@/lib/actions'

export function ContractsPanel({ state }: { state: GameState }) {
  const dispatch = useSubmit(dispatchAction)
  const revealedCities = new Set(state.revealedCities ?? ['new-lyon'])
  const live = state.contracts.filter((c) => !c.expired && revealedCities.has(c.from))
  const byCity = new Map<string, typeof live>()
  for (const c of live) {
    const arr = byCity.get(c.from) ?? []
    arr.push(c)
    byCity.set(c.from, arr)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        <Mini label="Open jobs" value={live.length} />
        <Mini label="Fulfilled" value={state.contracts.filter((c) => c.fulfilled).length} />
        <Mini label="Expired" value={state.contracts.filter((c) => c.expired).length} />
        <Mini label="Idle trains" value={state.trains.filter((t) => t.status === 'yard').length} />
      </div>

      {[...byCity.entries()].map(([from, contracts]) => {
        const def = CITY[from]
        return (
          <section key={from} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="mb-2 flex items-center justify-between">
              <span className="text-lg font-bold">{def?.name ?? from}</span>
              <span className="text-xs text-zinc-500">{contracts.length} offers</span>
            </h2>
            <div className="flex flex-col gap-2">
              {contracts.map((c) => (
                <ContractCard key={c.id} state={state} contract={c} dispatch={dispatch} />
              ))}
            </div>
          </section>
        );
      })}

      {live.length === 0 && (
        <p className="text-sm text-zinc-500">New offers arrive at the start of each day. Advance time from HQ.</p>
      )}
    </div>
  );
}

function ContractCard({
  state,
  contract,
  dispatch,
}: {
  state: GameState
  contract: GameState['contracts'][number]
  dispatch: { busy: boolean; err: string | null; submit: (e: React.FormEvent<HTMLFormElement>) => Promise<void> }
}) {
  const def = CITY[contract.from]
  const path = findPath(state, contract.from, contract.to)
  const idle = state.trains.filter((tr) => tr.status === 'yard')
  return (
    <form onSubmit={dispatch.submit} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <input type="hidden" name="contractId" value={contract.id} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{contract.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {def?.name} → {CITY[contract.to]?.name ?? contract.to} • {contract.type}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-emerald-400">{fmtMoney(contract.reward)}</p>
          <p className="text-xs text-zinc-500">+{contract.reputationReward} rep</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
        <span>{contract.cargo.map((g) => `${g.tons}t ${g.kind}`).join(', ') || `${contract.passengers} passengers`}</span>
        <span className={`rounded px-1.5 py-0.5 ${riskPill(contract.riskLabel)}`}>{contract.riskLabel} risk</span>
        {contract.warned && <span className="text-amber-400">⚠ running late</span>}
        {contract.type === 'emergency' && <span className="text-red-400">Emergency</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-zinc-500">
          Due {durationFmt(Math.max(0, contract.deadlineAt - state.minutes))}
          {path.ok && <> • {path.km} km</>}
        </span>
        <select
          name="trainId"
          defaultValue=""
          required
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 outline-none focus:border-amber-500"
        >
          <option value="" disabled>
            {idle.length ? 'Choose train…' : 'No idle train'}
          </option>
          {idle.map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={dispatch.busy || idle.length === 0 || !path.ok}
          className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-30"
        >
          Dispatch
        </button>
      </div>
      {!path.ok && <p className="mt-2 text-xs text-red-400">No usable line — repair or rebuild the connection first.</p>}
      {dispatch.err && <p className="mt-2 text-xs text-red-400">{dispatch.err}</p>}
    </form>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function riskPill(r: string) {
  const map: Record<string, string> = {
    low: 'bg-emerald-500/15 text-emerald-300',
    medium: 'bg-amber-500/15 text-amber-300',
    high: 'bg-red-500/15 text-red-300',
  }
  return map[r] ?? 'bg-zinc-800 text-zinc-400'
}