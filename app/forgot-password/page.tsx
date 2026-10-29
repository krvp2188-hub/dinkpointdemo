'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)

    const redirectTo =
      `${window.location.origin}/auth/callback?next=/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo,
      }
    )

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      'If an account exists with that email, we sent you a password reset link. Please check your email.'
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#09090d] px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-[#6f527c] bg-gradient-to-br from-[#1b1921] to-[#101015] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-6 flex flex-col items-center gap-3"><img src="/images/dink-point-logo.png" alt="Dink Point Pickleball Panabo" className="h-auto w-44 max-w-full object-contain" /><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#cfe3a0]">Pickleball · Panabo</p></div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Forgot Password?
        </h1>

        <p className="mt-2 text-sm text-slate-300">
          Enter your email address and we&apos;ll send you a link to reset
          your password.
        </p>

        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-200"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-lg border border-[#51415c] bg-[#0b0b10] px-3 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#bd91d0] focus:ring-2 focus:ring-[#8b6b9a]/25"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-900/70 bg-red-950/40 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-emerald-800/70 bg-emerald-950/40 p-3 text-sm text-emerald-200">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[#cfe3a0]/30 bg-gradient-to-r from-[#cfe3a0] to-[#b9d68b] px-4 py-3 font-semibold text-[#171a13] shadow-lg shadow-black/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-[#bd91d0] hover:text-white hover:underline"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}