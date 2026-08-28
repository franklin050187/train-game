import { redirect } from 'next/navigation'
import { currentUserId } from '../lib/auth'

export default async function Landing() {
  const userId = await currentUserId()
  if (userId) redirect('/game')
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-8 px-6 py-16">
      <p className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-widest text-amber-300">
        Post-Collapse Railroading
      </p>
      <h1 className="text-5xl font-bold leading-tight tracking-tight">
        Railway <span className="text-amber-400">Reclamation</span>
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-zinc-400">
        The Grand Collapse left the lines to the south in ruins. You run the
        first railroad back to working order: take contracts, haul cargo into
        starving towns, outrun bandit gangs, rebuild the network — and if you
        can, finish the Long Loop that circles the whole frontier.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/register"
          className="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
        >
          Start a career
        </a>
        <a
          href="/login"
          className="rounded-lg border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          Sign in
        </a>
        <a
          href="/leaderboard"
          className="rounded-lg border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          Leaderboard
        </a>
      </div>
      <dl className="mt-6 grid w-full grid-cols-3 gap-4 border-t border-zinc-800 pt-6 text-sm">
        <div>
          <dt className="text-zinc-500">Run contracts</dt>
          <dd className="mt-1 text-zinc-300">3 new offers per city, every day</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Outride bandits</dt>
          <dd className="mt-1 text-zinc-300">Escorts and armor vs. raider gangs</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Finish the Long Loop</dt>
          <dd className="mt-1 text-zinc-300">A ring of 11 segments around the map</dd>
        </div>
      </dl>
    </main>
  );
}