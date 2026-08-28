'use client'

import type { GameState, ReputationLevel } from '@/game/types'
import { dayOf } from '@/game/time'
import { reputationLabel, fmtMoney } from '@/game/economy'
import { computeScore } from '@/game/scoring'
import { REPUTATION_ORDER, REPUTATION_SCORE, LEVELS } from './game-data'
import type { Tab } from './game-shell'

export function OverviewPanel({
  state,
  advancing,
  go,
}: {
  state: GameState
  advancing: { busy: boolean; err: string | null; submit: (e: React.FormEvent<HTMLFormElement>) => Promise<void> }
  go: (t: Tab) => void
}) {
  const score = computeScore(state)
  const repIdx = REPUTATION_ORDER.indexOf(reputationLabel(state.reputation) as ReputationLevel)
  const repNext = REPUTATION_ORDER[repIdx + 1]
  const repPct = repNext ? Math.min(1, state.reputation / REPUTATION_SCORE[repNext]) : 1
  const lvl = state.cities['new-lyon'] ? LEVELS.find((l) => l.level === state.cities['new-lyon']!.level) : undefined

  const decrees = state.notifications.filter((n) => n.critical).slice(-3)

  const btns = [
    { id: 'next', mode: 'next-event', amount: 0, label: 'Next event', sign: 'next-event' },
    { id: 'hours', mode: 'hours', amount: 12, label: '+12h', sign: 'hours' },
    { id: 'days', mode: 'days', amount: 1, label: '+1 day', sign: 'days' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Credits" value={fmtMoney(state.credits)} />
        <StatCard label="Reputation" value={`${reputationLabel(state.reputation)} (${Math.round(state.reputation)})`} />
        <StatCard label="Influence" value={`${Math.round(state.influenceTotal)}`} />
        <StatCard label="Threat" value={`${Math.round(state.threatLevel * 100)}%`} />
        <StatCard label="Fleet" value={`${state.trains.length} trains`} />
        <StatCard label="Active" value={`${state.trains.filter((t) => t.status !== 'yard').length} running`} />
        <StatCard label="Legacy" value={`${state.legacy}`} />
        <StatCard label="Research" value={`${state.research.completed.length} done`} />
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Dispatch Desk</h2>
        <form onSubmit={advancing.submit} className="flex flex-wrap items-center gap-2">
          {btns.map((b) => (
            <button
              key={b.id}
              name="advance"
              value={b.amount > 0 ? `${b.mode}:${b.amount}` : b.mode}
              type="submit"
              disabled={advancing.busy}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-amber-500 disabled:opacity-50"
            >
              {b.label}
            </button>
          ))}
        </form>
        {advancing.err && <p className="mt-2 text-sm text-red-400">{advancing.err}</p>}
        {state.notifications.length > 0 && (
          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Latest</p>
            <ul className="space-y-1.5 text-sm">
              {state.notifications.slice(-4).reverse().map((n) => (
                <li key={`${n.at}-${n.kind}-${n.title}`} className="flex items-start gap-2">
                  <span className={dot(n.kind)} />
                  <span className="text-zinc-300">
                    <span className="font-semibold">{n.title}.</span> {n.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Railroad Status</h2>
          <span className="text-xs text-zinc-500">Day {dayOf(state.minutes)}</span>
        </div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span>Score</span>
          <span className="font-semibold">{score.total}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(2, repPct * 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {lvl ? `${lvl.name}: ` : ''}
          {lvl ? levelDetail(lvl.name) : ''}
          {repNext ? ` • Next rank: ${repNext} at ${REPUTATION_SCORE[repNext]} rep` : ' • Highest rank'}
        </p>
        {decrees.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-zinc-800 pt-3 text-sm">
            {decrees.map((n) => (
              <li key={`${n.at}-${n.title}`} className="flex items-start gap-2">
                <span className={dot(n.kind)} />
                <span>
                  <span className="font-semibold">{n.title}.</span> {n.body}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NavCard label="Map" onClick={() => go('map')} />
        <NavCard label="Contracts" onClick={() => go('contracts')} />
        <NavCard label="Cities" onClick={() => go('cities')} />
        <NavCard label="Great Loop" onClick={() => go('loop')} />
      </section>
    </div>
  );
}

function dot(kind: string) {
  const map: Record<string, string> = {
    info: 'bg-zinc-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }
  return `mt-1.5 h-2 w-2 shrink-0 rounded-full ${map[kind] ?? 'bg-zinc-500'}`
}

function levelDetail(name: string) {
  const map: Record<string, string> = {
    Outpost: 'a foothold.',
    Town: 'a working town.',
    Hub: 'a rising hub.',
    Metropolis: 'a metropolis.',
  }
  return map[name] ?? ''
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold">{value}</p>
    </div>
  );
}

function NavCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-left text-sm font-medium text-zinc-300 transition-colors hover:border-amber-500/60 hover:text-amber-300"
    >
      {label} →
    </button>
  );
}