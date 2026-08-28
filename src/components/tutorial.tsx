'use client'

import { useEffect, useState } from 'react'
import type { Tab } from './game-shell'

const STEPS: { tab: Tab; title: string; body: string }[] = [
  { tab: 'overview', title: 'Your HQ', body: 'This is your desk. Credits, reputation, and the big Dispatch buttons live here. Next Event fast-forwards until something happens.' },
  { tab: 'map', title: 'The Frontier', body: 'The shattered rail network. Gray lines are ruined; olive lines run. Tap a city to inspect its stock and reputation.' },
  { tab: 'contracts', title: 'Contracts', body: 'Towns post jobs each morning. Each contract needs a train in the right yard with the capacity to haul it. Dispatch from the Jobs tab.' },
  { tab: 'trains', title: 'Your Fleet', body: 'A rail line is only as good as its locomotives. Add wagons for capacity, reroute failures, and watch for amber decisions mid-journey — those are bandits, breakdowns, or blockades.' },
  { tab: 'cities', title: 'Rebuild Cities', body: 'Buildings raise city level and security. Safer towns mean cheaper routes and more contracts. Construction completes while you play.' },
  { tab: 'tech', title: 'Research', body: 'Tech cuts fuel burn, adds speed, and unlocks stronger kit. Spend research points to discount a project.' },
  { tab: 'loop', title: 'The Great Loop', body: 'The endgame: reach reputation 80, start the Loop, and fund every spur around the map. Finish it to unlock freeplay and prestige.' },
]

const KEY = 'tg:tutorial:v1'

export function TutorialOverlay({ onGo }: { onGo: (t: Tab) => void }) {
  const [step, setStep] = useState<number | null>(null)
  useEffect(() => {
    let handle: ReturnType<typeof setTimeout> | undefined
    try {
      if (typeof window === 'undefined') return
      if (localStorage.getItem(KEY) === 'done') return
      handle = setTimeout(() => setStep(0), 0)
    } catch {
      handle = setTimeout(() => setStep(0), 0)
    }
    return () => handle && clearTimeout(handle)
  }, [])

  if (step === null) return null
  const s = STEPS[step]
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/70 p-4" data-testid="tutorial">
      <div className="w-full max-w-sm rounded-xl border border-amber-500/40 bg-zinc-900 p-4 shadow-2xl">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
          Tutorial {step + 1}/{STEPS.length}
        </p>
        <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-300">{s.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              try {
                localStorage.setItem(KEY, 'done')
              } catch {
                /* ignore */
              }
              setStep(null)
            }}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            Skip tutorial
          </button>
          <button
            onClick={() => {
              onGo(s.tab)
              if (step + 1 >= STEPS.length) {
                try {
                  localStorage.setItem(KEY, 'done')
                } catch {
                  /* ignore */
                }
                setStep(null)
              } else {
                setStep(step + 1)
              }
            }}
            className="rounded-lg bg-amber-500 px-5 py-2 font-semibold text-zinc-950 hover:bg-amber-400"
          >
            {step + 1 >= STEPS.length ? 'Start running' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}