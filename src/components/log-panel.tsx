'use client'

import type { GameState } from '@/game/types'
import { buildTimeline } from '@/game/scoring'

export function LogPanel({ state }: { state: GameState }) {
  const events = buildTimeline(state)
  return (
    <div className="flex flex-col gap-4">
      {state.prestigeHistory.length > 0 && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">Past careers</h2>
          <ul className="space-y-1 text-sm">
            {state.prestigeHistory.map((p, i) => (
              <li key={p.at} className="text-zinc-400">
                Run {state.prestigeHistory.length - i}: score {p.finalScore} • legacy {p.legacy} on prestige
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Timeline</h2>
        {events.length === 0 && <p className="text-sm text-zinc-500">No history yet.</p>}
        <ul className="space-y-2">
          {events.map((e, idx) => (
            <li key={`${e.day}-${idx}`} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                D{e.day}
              </span>
              <p className="text-zinc-300">
                <span className="font-semibold">{e.label}.</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">All notifications</h2>
        <ul className="space-y-1.5 text-sm">
          {[...state.notifications].reverse().map((n, idx) => (
            <li key={`${n.at}-${idx}`} className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                n.kind === 'success' ? 'bg-emerald-500' : n.kind === 'danger' ? 'bg-red-500' : n.kind === 'warning' ? 'bg-amber-500' : 'bg-zinc-500'
              }`} />
              <p className="text-zinc-400">
                <span className="font-semibold text-zinc-300">{n.title}.</span> {n.body}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}