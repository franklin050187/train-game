import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth-forms'

export const metadata: Metadata = { title: 'Sign in — Railway Reclamation' }

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-stretch justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-400">The lines you left are waiting.</p>
      </div>
      <LoginForm />
      <p className="text-sm text-zinc-500">
        New here?{' '}
        <a href="/register" className="text-amber-400 hover:underline">Start a career</a>
      </p>
    </main>
  );
}