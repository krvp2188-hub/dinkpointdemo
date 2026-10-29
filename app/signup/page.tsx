'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      phone,
    },
    emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
  },
})

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (data.user) {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#09090d] px-4 py-10 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-[#6f527c] bg-gradient-to-br from-[#1b1921] to-[#101015] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-6 flex flex-col items-center gap-3"><img src="/images/dink-point-logo.png" alt="Dink Point Pickleball Panabo" className="h-auto w-44 max-w-full object-contain" /><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#cfe3a0]">Pickleball · Panabo</p></div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Check your email 📧
          </h1>

          <p className="mt-4 text-slate-300">
            We sent a confirmation email to:
          </p>

          <p className="mt-2 font-semibold">
            {email}
          </p>

          <p className="mt-4 text-sm text-slate-400">
            Please confirm your email address before logging in.
          </p>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-6 rounded-lg border border-[#cfe3a0]/30 bg-gradient-to-r from-[#cfe3a0] to-[#b9d68b] px-5 py-3 font-semibold text-[#171a13] transition hover:brightness-105"
          >
            Back to Home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#09090d] px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-[#6f527c] bg-gradient-to-br from-[#1b1921] to-[#101015] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-6 flex flex-col items-center gap-3"><img src="/images/dink-point-logo.png" alt="Dink Point Pickleball Panabo" className="h-auto w-44 max-w-full object-contain" /><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#cfe3a0]">Pickleball · Panabo</p></div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Create Player Account
        </h1>

        <p className="mt-2 text-slate-300">
          Create an account to manage your pickleball bookings.
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="w-full rounded-lg border border-[#51415c] bg-[#0b0b10] px-3 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#bd91d0] focus:ring-2 focus:ring-[#8b6b9a]/25"
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-[#51415c] bg-[#0b0b10] px-3 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#bd91d0] focus:ring-2 focus:ring-[#8b6b9a]/25"
              placeholder="juan@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Phone Number
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              className="w-full rounded-lg border border-[#51415c] bg-[#0b0b10] px-3 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#bd91d0] focus:ring-2 focus:ring-[#8b6b9a]/25"
              placeholder="09123456789"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-[#51415c] bg-[#0b0b10] px-3 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#bd91d0] focus:ring-2 focus:ring-[#8b6b9a]/25"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-[#51415c] bg-[#0b0b10] px-3 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#bd91d0] focus:ring-2 focus:ring-[#8b6b9a]/25"
              placeholder="Repeat your password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-900/70 bg-red-950/40 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[#cfe3a0]/30 bg-gradient-to-r from-[#cfe3a0] to-[#b9d68b] px-4 py-3 font-semibold text-[#171a13] shadow-lg shadow-black/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-[#cfe3a0] underline decoration-[#6f527c] underline-offset-4 hover:text-white">
            Log in
          </a>
        </p>
      </div>
    </main>
  )
}