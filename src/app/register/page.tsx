import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth-forms'

export const metadata: Metadata = { title: 'Register — Railway Reclamation' }

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-stretch justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Start a career</h1>
        <p className="mt-2 text-sm text-zinc-400">One player, one railroad. You can&apos;t lose; you can only run out of town.</p>
      </div>
      <RegisterForm />
      <p className="text-sm text-zinc-500">
        Already a conductor?{' '}
        <a href="/login" className="text-amber-400 hover:underline">Sign in</a>
      </p>
    </main>
  );
}