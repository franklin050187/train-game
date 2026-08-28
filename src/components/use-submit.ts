'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type AnyResult = { ok: boolean; error?: string }

export function useSubmit(fn: (fd: FormData) => Promise<AnyResult>) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return {
    busy,
    err,
    submit: async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      setBusy(true)
      setErr(null)
      try {
        const r = await fn(fd)
        if (r && !r.ok && r.error) setErr(r.error)
        else router.refresh()
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : 'Request failed')
      } finally {
        setBusy(false)
      }
    },
  }
}

export function useCall(fn: () => Promise<AnyResult>) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return {
    busy,
    err,
    call: async () => {
      setBusy(true)
      setErr(null)
      try {
        const r = await fn()
        if (r && !r.ok && r.error) setErr(r.error)
        else router.refresh()
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : 'Request failed')
      } finally {
        setBusy(false)
      }
    },
  }
}