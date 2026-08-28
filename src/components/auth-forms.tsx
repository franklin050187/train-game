'use client'

import { useActionState } from 'react'
import { registerAction, loginAction } from '@/lib/actions'

const b = 'rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-amber-500'

export function RegisterForm() {
  const [message, formAction, pending] = useActionState(registerAction, null)
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="name" placeholder="Your name" required className={b} />
      <input name="email" type="email" placeholder="Email" required className={b} />
      <input name="password" type="password" placeholder="Password (6+ chars)" required minLength={6} className={b} />
      {message && <p className="text-sm text-red-400">{message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-zinc-950 disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Start career'}
      </button>
    </form>
  );
}

export function LoginForm() {
  const [message, formAction, pending] = useActionState(loginAction, null)
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="email" type="email" placeholder="Email" required className={b} />
      <input name="password" type="password" placeholder="Password" required className={b} />
      {message && <p className="text-sm text-red-400">{message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-zinc-950 disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}