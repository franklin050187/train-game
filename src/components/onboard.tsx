'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { newGameAction } from '@/lib/actions'

export function Onboard() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    setErr(null)
    try {
      const r = await newGameAction(fd)
      if (r && !r.ok && r.error) setErr(r.error)
      else router.refresh()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-stretch justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome aboard, Conductor</h1>
        <p className="mt-2 text-sm text-zinc-400">
          One railroad, one frontier. Carry cargo, outride bandits, rebuild the lines, and chase the Great Loop.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Railroad name
          <input
            name="name"
            defaultValue="New Lyon & Frontier Line"
            required
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-amber-500"
          />
        </label>
        <button
          type="submit"
          name="demo"
          value="0"
          disabled={busy}
          className="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? 'Rolling out…' : 'Start my railroad'}
        </button>
      </form>
      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <span className="h-px flex-1 bg-zinc-800" />
        or
        <span className="h-px flex-1 bg-zinc-800" />
      </div>
      <button
        onClick={async () => {
          const fd = new FormData()
          fd.set('demo', '1')
          fd.set('name', 'Tour Guide')
          setBusy(true)
          setErr(null)
          try {
            const r = await newGameAction(fd)
            if (r && !r.ok && r.error) setErr(r.error)
            else router.refresh()
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : 'Request failed')
          } finally {
            setBusy(false)
          }
        }}
        disabled={busy}
        className="rounded-lg border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
      >
        Try the demo snapshot
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </main>
  );
}