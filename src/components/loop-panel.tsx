'use client'

import type { GameState } from '@/game/types'
import { LOOP_SEGMENT_IDS } from '@/game/world'
import { fmtMoney } from '@/game/economy'
import { loopSegmentInfo } from '@/game/endgame'
import { useCall, useSubmit } from './use-submit'
import { loopStartAction, loopFundAction, prestigeAction } from '@/lib/actions'

export function LoopPanel({ state }: { state: GameState }) {
  const start = useCall(loopStartAction)
  const fund = useSubmit(loopFundAction)
  const prestige = useCall(prestigeAction)
  const infos = LOOP_SEGMENT_IDS.map((id) => loopSegmentInfo(state, id))
  const done = infos.filter((i) => i.complete).length
  const started = state.loop.started

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-amber-700/30 bg-amber-950/20 p-4">
        <h2 className="text-lg font-bold">The Great Loop</h2>
        <p className="mt-1 text-sm text-zinc-400">
          A full circuit of the frontier. Finish all {LOOP_SEGMENT_IDS.length} spur lines to complete it, unlock
          freeplay, and make history.
        </p>
        {state.loop.completeAt ? (
          <p className="mt-3 rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-3 text-sm font-semibold text-emerald-300">
            The Great Loop is complete. You did it. Freeplay is open; prestige when ready.
          </p>
        ) : started ? (
          <p className="mt-3 text-sm">
            <span className="font-semibold text-amber-300">{done}/{LOOP_SEGMENT_IDS.length}</span> spurs rebuilt.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-300">
              Requires <span className="font-semibold">reputation 80+</span> (you have {Math.round(state.reputation)}).
            </p>
            <button
              onClick={start.call}
              disabled={start.busy || state.reputation < 80}
              className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-30"
            >
              {state.reputation < 80 ? 'Locked' : 'Begin the Great Loop'}
            </button>
            {start.err && <p className="mt-2 text-sm text-red-400">{start.err}</p>}
          </>
        )}
      </section>

      {started && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {infos.map((i) => (
            <div
              key={i.segId}
              className={`rounded-lg border p-3 ${
                i.complete ? 'border-emerald-700/40 bg-emerald-950/20' : i.unlocked ? 'border-zinc-700 bg-zinc-900/60' : 'border-zinc-800/60 bg-zinc-900/30'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{i.name}</p>
                {i.complete && <span className="text-xs font-semibold text-emerald-400">Complete</span>}
              </div>
              <p className="text-xs text-zinc-500">{i.km} km loop section</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(2, i.progress * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-zinc-500">{Math.round(i.progress * 100)}% funded</p>
              {!i.unlocked && !i.complete && (
                <p className="mt-1 text-xs text-zinc-600">{i.unlockReason ?? 'Locked'}</p>
              )}
              {i.unlocked && !i.complete && (
                <form onSubmit={fund.submit} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="segId" value={i.segId} />
                  <button
                    type="submit"
                    disabled={fund.busy || state.credits < i.costPerFund}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-30"
                  >
                    Fund ({fmtMoney(i.costPerFund)})
                  </button>
                  <span className="text-xs text-zinc-500">{fmtMoney(i.totalCost)} total</span>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {state.loop.completeAt && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Prestige</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Reset the world as a legend: legacy +1, start credits and reputation rise, your achievement list carries
            over. Score this run is recorded to the hall of fame.
          </p>
          <button
            onClick={prestige.call}
            disabled={prestige.busy}
            className="mt-3 rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
          >
            Prestige (legacy {state.legacy} → {state.legacy + 1})
          </button>
          {prestige.err && <p className="mt-2 text-sm text-red-400">{prestige.err}</p>}
        </section>
      )}
      {fund.err && <p className="text-sm text-red-400">{fund.err}</p>}
    </div>
  );
}