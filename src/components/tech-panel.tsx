'use client'

import type { GameState } from '@/game/types'
import { TECHS } from './game-data'
import { fmtMoney } from '@/game/economy'
import { researchStatus } from '@/game/research'
import { useSubmit } from './use-submit'
import { researchAction } from '@/lib/actions'

export function TechPanel({ state }: { state: GameState }) {
  const research = useSubmit(researchAction)
  const points = state.research.points

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="text-sm">
          <span className="font-semibold text-amber-300">{points}</span> research point{points === 1 ? '' : 's'} —
          spend up to 2 points per project to cut its credit cost (~25% each).
        </p>
      </section>

      <div className="flex flex-col gap-2">
        {Object.values(TECHS).map((t) => {
          const status = researchStatus(state, t.id)
          const prog = state.research.progress.find((p) => p.techId === t.id)
          return (
            <section
              key={t.id}
              className={`rounded-lg border p-4 ${
                status === 'available' ? 'border-zinc-700 bg-zinc-900/60' : 'border-zinc-800/60 bg-zinc-900/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t.category} • {t.timeDays}d
                    {t.requires?.length ? ` • needs ${t.requires.map((r) => TECHS[r]?.name).join(', ')}` : ''}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs ${statusPill(status)}`}>{status}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-300">{t.description}</p>
              {t.perk && (
                <p className="mt-1 text-xs text-emerald-400">
                  {Object.entries(t.perk)
                    .filter(([, v]) => v !== undefined && v !== 0)
                    .map(([k, v]) => `${k} ${(v as number) > 0 ? '+' : ''}${Math.round((v as number) * 100)}%`)
                    .join(', ')}
                </p>
              )}
              {prog ? (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${Math.max(3, (1 - prog.remainingDays / t.timeDays) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Done in {prog.remainingDays} day{prog.remainingDays === 1 ? '' : 's'}
                  </p>
                </div>
              ) : null}
              {status === 'available' && (
                <form onSubmit={research.submit} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="techId" value={t.id} />
                  <input type="hidden" name="points" value={points >= 1 ? Math.min(2, points) : 0} />
                  <button
                    type="submit"
                    disabled={research.busy || state.credits < (points >= 1 ? Math.max(0, t.cost - Math.min(2, points) * 2500) : t.cost)}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-30"
                  >
                    Start ({fmtMoney(points >= 1 ? Math.max(0, t.cost - Math.min(2, points) * 2500) : t.cost)})
                  </button>
                </form>
              )}
              {research.err && <p className="mt-2 text-sm text-red-400">{research.err}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function statusPill(s: string) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-300',
    running: 'bg-amber-500/15 text-amber-300',
    available: 'bg-zinc-800 text-zinc-300',
    locked: 'bg-zinc-900 text-zinc-600',
  }
  return map[s] ?? 'bg-zinc-800 text-zinc-400'
}