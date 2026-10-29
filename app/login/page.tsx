'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  setError('Unable to get your account information.')
  setLoading(false)
  return
}

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profileError) {
  setError('Unable to load your account role.')
  setLoading(false)
  return
}

if (profile.role === 'admin') {
  router.push('/admin')
} else if (profile.role === 'staff') {
  router.push('/staff')
} else {
  router.push('/my-bookings')
}

router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#09090d] px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-[#6f527c] bg-gradient-to-br from-[#1b1921] to-[#101015] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">

        <div className="mb-6 flex flex-col items-center gap-3"><img src="/images/dink-point-logo.png" alt="Dink Point Pickleball Panabo" className="h-auto w-44 max-w-full object-contain" /><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#cfe3a0]">Pickleball · Panabo</p></div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Player Login
        </h1>

        <p className="mt-2 text-slate-300">
          Log in to view and manage your bookings.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">

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
              placeholder="you@email.com"
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
              placeholder="Your password"
            />
			
			<div className="text-right">
			<a href="/forgot-password" className="text-sm font-medium text-[#bd91d0] hover:text-white hover:underline">
			Forgot password?
			</a>
		  </div>
		
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
            {loading ? 'Logging in...' : 'Log In'}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Don't have an account?{' '}
          <a
            href="/signup"
            className="font-semibold text-[#cfe3a0] underline decoration-[#6f527c] underline-offset-4 hover:text-white"
          >
            Create an account
          </a>
        </p>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-slate-400 hover:text-white hover:underline"
          >
            Continue as Guest
          </a>
        </div>

      </div>
    </main>
  )
}