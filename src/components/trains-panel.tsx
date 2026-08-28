'use client'

import type { GameState } from '@/game/types'
import { LOCOS, WAGON_DEFS } from './game-data'
import { computeTrainStats } from '@/game/trains'
import { findPath } from '@/game/network'
import { fmtMoney } from '@/game/economy'
import { durationFmt } from '@/game/time'
import { pendingJourneys } from '@/game/journeys'
import { useSubmit } from './use-submit'
import { dispatchAction, resolveAction, addWagonAction, removeWagonAction, renameTrainAction } from '@/lib/actions'

export function TrainsPanel({ state }: { state: GameState }) {
  const dispatch = useSubmit(dispatchAction)
  const resolve = useSubmit(resolveAction)
  const addW = useSubmit(addWagonAction)
  const removeW = useSubmit(removeWagonAction)
  const rename = useSubmit(renameTrainAction)
  const waiting = pendingJourneys(state)

  return (
    <div className="flex flex-col gap-4">
      {waiting.length > 0 && (
        <section className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-300">
            Decisions needed ({waiting.length})
          </h2>
          <div className="flex flex-col gap-3">
            {waiting.map((j) => {
              const enc = j.encounters.find((e) => !e.resolved)
              const train = state.trains.find((t) => t.id === j.trainId)
              return (
                <div key={j.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="font-semibold">{enc?.title ?? 'Encounter'}</p>
                  <p className="mt-1 text-sm text-zinc-400">{enc?.text}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {train?.name} • threat {enc ? Math.round(enc.threat * 100) : 0}%
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {enc?.options.map((o) => (
                      <form key={o.id} onSubmit={resolve.submit} className="contents">
                        <input type="hidden" name="journeyId" value={j.id} />
                        <input type="hidden" name="optionId" value={o.id} />
                        <button
                          type="submit"
                          disabled={resolve.busy}
                          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:border-amber-500 disabled:opacity-50"
                        >
                          {o.label}
                          {o.cost ? ` • ${fmtMoney(o.cost)}` : ''}
                        </button>
                      </form>
                    ))}
                  </div>
                  {enc?.note && <p className="mt-1 text-xs text-emerald-400">{enc.note}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {state.trains.map((t) => {
        const stats = computeTrainStats(state, t)
        const loco = LOCOS[t.locoId]
        const j = t.journey
        const connected = [
          ...new Set(
            state.contracts
              .filter((c) => !c.expired && c.from === t.location)
              .map((c) => c.to),
          ),
        ]
        return (
          <section key={t.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{t.name}</p>
                <p className="text-xs text-zinc-500">
                  {loco?.name ?? t.locoId} • {t.wagons.length} wagon{t.wagons.length === 1 ? '' : 's'} •{' '}
                  {stats.weight}t capacity
                </p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs ${statusPill(t.status)}`}>
                {t.status.replace('-', ' ')}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
              <span>Speed {stats.speedKmh} km/h</span>
              <span>Armor {Math.round(stats.armor * 100)}%</span>
              <span>Security {Math.round(stats.security * 100)}%</span>
              <span>Fuel {stats.fuelRatePerKm} L/km</span>
              <span>Location: {t.location}</span>
            </div>

            {/* Visual train composition */}
            <div className="mt-3 overflow-x-auto pb-2">
              <div className="flex items-end gap-1 min-w-max">
                <TrainCar kind="loco" label={loco?.name ?? t.locoId} weight={loco?.weight ?? 0} />
                {t.wagons.map((w, i) => (
                  <TrainCar key={`${t.id}-${i}`} kind="wagon" label={WAGON_DEFS[w.defId]?.name ?? w.defId} weight={WAGON_DEFS[w.defId]?.weight ?? 0} condition={w.condition} />
                ))}
                {t.wagons.length === 0 && (
                  <div className="flex items-center gap-1 text-xs text-zinc-600 px-2 py-1 rounded bg-zinc-800">
                    <span className="w-8 h-2 bg-zinc-700 rounded" />
                    <span>No wagons attached</span>
                  </div>
                )}
              </div>
            </div>

            {j && j.status === 'enroute' ? (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-sm">
                  <span className="font-semibold">{j.from}</span> →{' '}
                  <span className="font-semibold">{j.to}</span>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${Math.min(100, Math.max(2, ((state.minutes - j.dispatchAt) / (j.arrivalAt - j.dispatchAt)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Arrives in {durationFmt(Math.max(0, j.arrivalAt - state.minutes))} • reward {fmtMoney(j.reward)}
                  {j.encounters.length > 0 && ` • ${j.encounters.filter((e) => !e.resolved).length} events ahead`}
                </p>
              </div>
            ) : null}

            {j && j.status === 'arrived' ? (
              <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3 text-sm">
                <span className="font-semibold text-emerald-300">Arrived.</span> {j.result}
              </div>
            ) : null}

            {t.status === 'yard' ? (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(WAGON_DEFS).map(([id, w]) => (
                    <form key={id} onSubmit={addW.submit} className="contents">
                      <input type="hidden" name="trainId" value={t.id} />
                      <input type="hidden" name="wagonId" value={id} />
                      <button
                        type="submit"
                        disabled={addW.busy || t.wagons.length >= 6}
                        title={`${w.name} • ${fmtMoney(w.cost)}`}
                        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:border-amber-500 disabled:opacity-30"
                      >
                        +{w.name} ({fmttonnes(w.weight)}t)
                      </button>
                    </form>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {t.wagons.map((w, i) => (
                    <form key={`${t.id}-${i}`} onSubmit={removeW.submit} className="contents">
                      <input type="hidden" name="trainId" value={t.id} />
                      <input type="hidden" name="index" value={i} />
                      <button
                        type="submit"
                        title="Remove wagon"
                        className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-zinc-400 hover:border-red-500 hover:text-red-400"
                      >
                        {WAGON_DEFS[w.defId]?.name ?? w.defId} ✕
                      </button>
                    </form>
                  ))}
                </div>
                <form onSubmit={rename.submit} className="flex items-center gap-2 text-xs">
                  <input type="hidden" name="trainId" value={t.id} />
                  <input name="name" defaultValue={t.name} className="w-36 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 outline-none focus:border-amber-500" />
                  <button type="submit" className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-amber-500">
                    Rename
                  </button>
                </form>
              </div>
            ) : null}

            {connected.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">
                  Dispatch {t.name}
                </summary>
                <div className="mt-2 flex flex-col gap-1.5">
                  {connected.map((to) => (
                    <div key={to}>
                      <p className="text-xs font-medium text-zinc-500">{to}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1.5">
                        {state.contracts
                          .filter((c) => !c.expired && c.from === t.location && c.to === to)
                          .map((c) => {
                            const path = findPath(state, c.from, c.to)
                            return (
                              <form key={c.id} onSubmit={dispatch.submit} className="contents">
                                <input type="hidden" name="trainId" value={t.id} />
                                <input type="hidden" name="contractId" value={c.id} />
                                <button
                                  type="submit"
                                  disabled={dispatch.busy || !path.ok}
                                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-left text-xs text-zinc-300 hover:border-amber-500 disabled:opacity-30"
                                >
                                  <span className="block font-medium">
                                    {c.title} • {fmtMoney(c.reward)}
                                  </span>
                                  <span className="block text-zinc-500">
                                    {c.cargo.map((g) => `${g.tons}t ${g.kind}`).join(', ') || `${c.passengers} pax`} • {c.riskLabel} risk
                                  </span>
                                </button>
                              </form>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
            {dispatch.err && <p className="mt-2 text-sm text-red-400">{dispatch.err}</p>}
          </section>
        );
      })}

      {state.trains.length === 0 && (
        <p className="text-sm text-zinc-500">No trains. Your railroad starts with one — check the snapshot.</p>
      )}
    </div>
  );
}

function statusPill(s: string) {
  const map: Record<string, string> = {
    yard: 'bg-zinc-800 text-zinc-300',
    transit: 'bg-emerald-500/15 text-emerald-300',
    'awaiting-decision': 'bg-amber-500/15 text-amber-300',
    lost: 'bg-red-500/15 text-red-300',
  }
  return map[s] ?? 'bg-zinc-800 text-zinc-300'
}

function fmttonnes(t: number) {
  return Number.isInteger(t) ? t : t.toFixed(1)
}

function TrainCar({ kind, label, weight, condition }: { kind: 'loco' | 'wagon'; label: string; weight: number; condition?: number }) {
  const isLoco = kind === 'loco'
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label} • ${weight}t${condition !== undefined ? ` • ${condition}%` : ''}`}>
      <div className={`relative ${isLoco ? 'w-14 h-10' : 'w-10 h-8'} rounded-sm`} style={{
        background: isLoco ? 'linear-gradient(180deg, #3f3f46 0%, #18181b 100%)' : 'linear-gradient(180deg, #52525b 0%, #27272a 100%)',
        border: '1px solid #3f3f46',
        boxShadow: 'inset 0 1px 0 #71717a20, inset 0 -1px 0 #00000040'
      }}>
        {isLoco && (
          <>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500/80" />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 rounded bg-zinc-700" />
          </>
        )}
        {!isLoco && condition !== undefined && (
          <div className="absolute top-0 right-0 w-full h-1 rounded-t" style={{
            background: condition > 70 ? 'linear-gradient(90deg, #22c55e, #4ade80)' : condition > 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)'
          }} />
        )}
        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-zinc-300 select-none">
          {isLoco ? '🚂' : '🚃'}
        </div>
      </div>
      <span className="text-[9px] text-zinc-500 whitespace-nowrap truncate max-w-[70px]" style={{ textAlign: 'center' }}>
        {label}
      </span>
      <span className="text-[8px] text-zinc-600">{weight}t</span>
      {condition !== undefined && <span className="text-[8px] text-zinc-500">{condition}%</span>}
    </div>
  )
}