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
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold">
            Check your email 📧
          </h1>

          <p className="mt-4 text-gray-600">
            We sent a confirmation email to:
          </p>

          <p className="mt-2 font-semibold">
            {email}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Please confirm your email address before logging in.
          </p>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-6 rounded-lg bg-black px-5 py-3 text-white"
          >
            Back to Home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">
          Create Player Account
        </h1>

        <p className="mt-2 text-gray-600">
          Create an account to manage your pickleball bookings.
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">

          <div>
            <label className="mb-1 block text-sm font-medium">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="w-full rounded-lg border px-3 py-3"
              placeholder="Juan Dela Cruz"
            />
          </div>

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
              placeholder="juan@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Phone Number
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              className="w-full rounded-lg border px-3 py-3"
              placeholder="09123456789"
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
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="w-full rounded-lg border px-3 py-3"
              placeholder="Repeat your password"
            />
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="font-semibold underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  )
}