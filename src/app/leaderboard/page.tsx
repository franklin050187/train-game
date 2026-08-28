import type { Metadata } from 'next'
import Link from 'next/link'
import { leaderboard } from '@/lib/repo'

export const metadata: Metadata = { title: 'Hall of Fame — Railway Reclamation' }
export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const rows = await leaderboard()
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hall of Fame</h1>
          <p className="mt-1 text-sm text-zinc-400">
            The runs that finished the Great Loop and chose to carry on.
          </p>
        </div>
        <Link href="/" className="text-sm text-amber-400 hover:underline">Back home</Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-500">
          No legends yet. Complete the Great Loop, prestige, and be the first name up here.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={`${r.playerName}-${i}`} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <span className={`w-8 shrink-0 text-lg font-bold ${i === 0 ? 'text-amber-400' : i < 3 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.playerName}</p>
                <p className="truncate text-xs text-zinc-500">{r.summary}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-300">{r.score.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">legacy {r.legacy}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}