'use client'

import { useState } from 'react'
import type { GameState } from '@/game/types'
import { useSubmit } from './use-submit'
import { advanceAction, logoutAction } from '@/lib/actions'
import { dayOf, fmtClock } from '@/game/time'
import { reputationLabel, fmtMoney } from '@/game/economy'
import { OverviewPanel } from './overview-panel'
import { MapPanel } from './map-panel'
import { TrainsPanel } from './trains-panel'
import { ContractsPanel } from './contracts-panel'
import { CitiesPanel } from './cities-panel'
import { TechPanel } from './tech-panel'
import { RoutesPanel } from './routes-panel'
import { LoopPanel } from './loop-panel'
import { LogPanel } from './log-panel'
import { TutorialOverlay } from './tutorial'

export type Tab = 'overview' | 'map' | 'trains' | 'contracts' | 'cities' | 'tech' | 'routes' | 'loop' | 'log'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'HQ', icon: '▦' },
  { id: 'map', label: 'Map', icon: '◈' },
  { id: 'trains', label: 'Trains', icon: '▭' },
  { id: 'contracts', label: 'Jobs', icon: '☷' },
  { id: 'cities', label: 'Cities', icon: '◉' },
  { id: 'tech', label: 'Lab', icon: '⚗' },
  { id: 'routes', label: 'Routes', icon: '⇄' },
  { id: 'loop', label: 'Loop', icon: '◌' },
  { id: 'log', label: 'Log', icon: '≡' },
]

export function GameShell({ state }: { state: GameState }) {
  const [tab, setTab] = useState<Tab>('overview')
  const advancing = useSubmit(advanceAction)
  const day = dayOf(state.minutes)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Railway Reclamation</p>
            <p className="text-xs text-zinc-500">
              Day {day} <span className="text-zinc-600">•</span> {state.playerName}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded bg-zinc-900 px-2 py-1" title="Credits">
              {fmtMoney(state.credits)}
            </span>
            <span className="rounded bg-zinc-900 px-2 py-1" title="Reputation">
              {reputationLabel(state.reputation)}
            </span>
            <span className="hidden rounded bg-zinc-900 px-2 py-1 sm:inline" title="Time">
              {fmtClock(state.minutes)}
            </span>
            {state.loop.started && !state.loop.completeAt && (
              <span className="rounded bg-amber-500/15 px-2 py-1 text-amber-300" title="Great Loop">
                ◌ Loop
              </span>
            )}
            <button
              onClick={() => void logoutAction()}
              className="rounded border border-zinc-800 px-2 py-1 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4">
        {tab === 'overview' && <OverviewPanel state={state} advancing={advancing} go={setTab} />}
        {tab === 'map' && <MapPanel state={state} go={setTab} />}
        {tab === 'trains' && <TrainsPanel state={state} />}
        {tab === 'contracts' && <ContractsPanel state={state} />}
        {tab === 'cities' && <CitiesPanel state={state} />}
        {tab === 'tech' && <TechPanel state={state} />}
        {tab === 'routes' && <RoutesPanel state={state} />}
        {tab === 'loop' && <LoopPanel state={state} />}
        {tab === 'log' && <LogPanel state={state} />}
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-9">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                tab === t.id ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="text-sm leading-none">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <TutorialOverlay onGo={setTab} />
    </div>
  );
}