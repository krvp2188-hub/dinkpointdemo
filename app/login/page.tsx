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
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">

        <h1 className="text-3xl font-bold">
          Player Login
        </h1>

        <p className="mt-2 text-gray-600">
          Log in to view and manage your bookings.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">

          <div>
            <label className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border px-3 py-3"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border px-3 py-3"
              placeholder="Your password"
            />
			
			<div className="text-right">
			<a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
			Forgot password?
			</a>
		  </div>
		
          </div>


          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a
            href="/signup"
            className="font-semibold underline"
          >
            Create an account
          </a>
        </p>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:underline"
          >
            Continue as Guest
          </a>
        </div>

      </div>
    </main>
  )
}