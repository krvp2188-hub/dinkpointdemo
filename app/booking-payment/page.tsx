
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import html2canvas from 'html2canvas-pro'

type PaymentSession = {
  bookingReference: string
  totalAmount: number
  bookingDate: string
  slots: {
    courtName: string
    startTime: string
    endTime: string
    status: string
  }[]
  paymentStatus: 'paid' | 'cancelled' | 'unpaid'
}

function formatTime(time: string): string {
  const [hours, minutes = '00'] = time.split(':')
  const hour = Number(hours)

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return time
  }

  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:${minutes} ${period}`
}

export default function BookingPaymentPage() {
  const screenshotRef = useRef<HTMLDivElement>(null)
  const [savingScreenshot, setSavingScreenshot] = useState(false)
  const [token, setToken] = useState('')
  const tokenRef = useRef('')
  const [session, setSession] = useState<PaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const urlToken = window.location.hash.startsWith('#token=')
      ? window.location.hash.slice(7)
      : ''

    const guestToken = urlToken || tokenRef.current

    if (guestToken) {
      tokenRef.current = guestToken
    }

    const reference =
      new URLSearchParams(window.location.search).get('reference') || ''

    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    )

    setToken(guestToken)

    async function loadSession() {
      if (!guestToken || !reference) {
        setError(
          'This payment link is missing information. Please use your original booking link.'
        )
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/payment-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference,
            token: guestToken,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Could not verify your booking.')
          return
        }

        setSession(result as PaymentSession)
      } catch {
        setError(
          'Unable to connect. Please check your internet and try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadSession()
  }, [])

  useEffect(() => {
    if (!session || session.paymentStatus !== 'unpaid' || !token) {
      return
    }

    let active = true

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch('/api/payment-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: session.bookingReference,
            token,
          }),
          cache: 'no-store',
        })

        if (!response.ok) return

        const result = (await response.json()) as PaymentSession

        if (active) {
          setSession(result)
        }
      } catch {
        // Retry at the next interval.
      }
    }

    const intervalId = window.setInterval(() => {
      void checkPaymentStatus()
    }, 10000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [session?.bookingReference, session?.paymentStatus, token])

  async function saveBookingScreenshot() {
    if (!screenshotRef.current || !session) return

    setSavingScreenshot(true)

    try {
      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: '#090909',
        scale: 2,
        useCORS: true,
      })

      const link = document.createElement('a')
      link.download = `Dink-Point-${session.bookingReference}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Could not save booking screenshot:', error)
      setMessage('Could not save the screenshot. Please try again.')
    } finally {
      setSavingScreenshot(false)
    }
  }

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!session || !token || !receipt) {
      setMessage('Please select a receipt image.')
      return
    }

    if (!transactionReference.trim()) {
      setMessage('Please enter your GCash transaction reference.')
      return
    }

    if (receipt.size > 5 * 1024 * 1024) {
      setMessage('The receipt image must be 5 MB or smaller.')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('bookingReference', session.bookingReference)
      formData.append('token', token)
      formData.append(
        'transactionReference',
        transactionReference.trim()
      )
      formData.append('receipt', receipt)

      const response = await fetch('/api/payment-receipt', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || 'Receipt submission failed.')
        return
      }

      setMessage(
        result.message ||
          'Receipt submitted. Please wait for staff verification.'
      )
      setReceipt(null)
      setTransactionReference('')
    } catch {
      setMessage('Unable to submit the receipt. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-[#090909] p-6 text-white">
        Verifying your booking...
      </main>
    )
  }

  if (error || !session || !token) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-[#090909] p-6 text-white">
        <h1 className="text-2xl font-bold text-white">Booking Payment</h1>
        <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-red-300">
          {error || 'This payment link is invalid or expired.'}
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500"
        >
          Back to Homepage
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-[#090909] p-6 text-white">
      <h1 className="text-3xl font-bold tracking-tight text-white">Complete Your Booking</h1>

      {session.paymentStatus === 'unpaid' && (
        <section className="mt-4 rounded-xl border border-amber-500/60 bg-amber-950/40 p-4 text-amber-100">
          <p className="text-sm">
            Your booking is pending until staff reviews your GCash payment receipt.
            Please submit your receipt after payment and wait for confirmation.
          </p>
        </section>
      )}

      {/* This is the only booking summary and reference screenshot area. */}
      <div
        ref={screenshotRef}
        className="mt-5 rounded-xl border border-white/15 bg-[#111111] p-4 text-white shadow-lg shadow-black/20"
      >
        <h2 className="mb-3 text-sm font-semibold text-emerald-400">
          Dink Point Pickleball
        </h2>

        <h2 className="text-xl font-bold text-white">Your Selection</h2>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#1a1a1a] p-4 text-gray-100">
          <p>
            <strong>Date:</strong> {session.bookingDate}
          </p>

          <p className="mt-1">
            <strong>Courts:</strong>{' '}
            {Array.from(
              new Set(session.slots.map(slot => slot.courtName))
            ).join(', ')}
          </p>

          <div className="mt-4">
            <strong>Selected Hours:</strong>

            <div className="mt-2 space-y-2">
              {session.slots.map((slot, index) => (
                <div
                  key={`${slot.courtName}-${slot.startTime}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#242424] p-3 text-gray-100"
                >
                  <span>
                    {slot.courtName} · {formatTime(slot.startTime)}–
                    {formatTime(slot.endTime)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <p>
              <strong>Total Hours:</strong> {session.slots.length}
            </p>

            <p className="mt-1 text-xl font-bold">
              <strong>Total:</strong>{' '}
              ₱
              {session.totalAmount.toLocaleString('en-PH', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {session.paymentStatus === 'paid' && (
          <section className="mt-4 rounded-xl border border-white/15 bg-[#151515] p-4 text-white">
            <h2 className="text-xl font-semibold">Payment received</h2>
            <p className="mt-2">
              Your payment has been recorded. Save your booking reference
              for future inquiries.
            </p>

            <div className="mt-4 rounded-lg border border-white/10 bg-[#202020] p-4">
              <p className="text-sm font-medium text-gray-400">
                Your booking reference
              </p>
              <p className="mt-1 break-all text-lg font-bold">
                {session.bookingReference}
              </p>
            </div>
          </section>
        )}

        {session.paymentStatus === 'cancelled' && (
          <section className="mt-4 rounded-xl border border-white/15 bg-[#151515] p-4 text-white">
            <h2 className="text-xl font-semibold">Booking cancelled</h2>
            <p className="mt-2">
              This booking has been cancelled. Please contact staff if you
              believe this is an error.
            </p>
            <p className="mt-3 text-sm text-gray-400">
              Booking reference
            </p>
            <p className="mt-1 break-all font-bold">
              {session.bookingReference}
            </p>
          </section>
        )}
      </div>

      {session.paymentStatus === 'paid' && (
        <>
          <button
            type="button"
            onClick={() => void saveBookingScreenshot()}
            disabled={savingScreenshot}
            className="mt-3 w-full rounded-lg border border-emerald-500/70 px-4 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-950/50 disabled:opacity-50"
          >
            {savingScreenshot
              ? 'Saving Screenshot...'
              : 'Save Booking Screenshot'}
          </button>

          <Link
            href="/"
            className="mt-4 block w-full rounded-lg bg-emerald-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-emerald-500"
          >
            Back to Homepage
          </Link>
        </>
      )}

      {session.paymentStatus === 'unpaid' && (
        <>
          <section className="mt-6 rounded-xl border border-white/15 bg-[#111111] p-4 text-white">
            <h2 className="text-xl font-semibold">Pay with GCash</h2>
            <img
              src="/images/QR.png"
              alt="Dink Point Pickleball GCash QR code"
              className="mx-auto mt-4 w-full max-w-xs"
            />
            <p className="mt-4 text-sm leading-6 text-gray-300">
              Pay the exact total shown above. Check the recipient details
              in GCash before confirming.
            </p>
          </section>

          <form
            onSubmit={submitReceipt}
            className="mt-6 space-y-4 rounded-xl border border-white/15 bg-[#111111] p-4 text-white"
          >
            <h2 className="text-xl font-semibold">
              Submit Payment Receipt
            </h2>

            <div>
              <label
                htmlFor="transactionReference"
                className="mb-1 block text-sm font-medium text-gray-200"
              >
                GCash transaction reference
              </label>
              <input
                id="transactionReference"
                name="transactionReference"
                value={transactionReference}
                onChange={event =>
                  setTransactionReference(event.target.value)
                }
                required
                minLength={4}
                maxLength={100}
                autoComplete="off"
                className="w-full rounded-lg border border-white/25 bg-[#090909] p-3 text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                placeholder="Enter your transaction reference"
              />
            </div>

            <div>
              <label
                htmlFor="receipt"
                className="mb-1 block text-sm font-medium text-gray-200"
              >
                Receipt image (JPG, PNG, or WebP; max 5 MB)
              </label>
              <input
                id="receipt"
                name="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={event =>
                  setReceipt(event.target.files?.[0] || null)
                }
                className="w-full rounded-lg border border-white/25 bg-[#090909] p-3 text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Receipt'}
            </button>

            {message && (
              <p role="status" className="rounded-lg border border-white/10 bg-[#202020] p-3 text-sm text-gray-100">
                {message}
              </p>
            )}

            <p className="text-sm leading-6 text-gray-400">
              Your booking remains unconfirmed until staff verifies the
              actual GCash transaction.
            </p>
          </form>
        </>
      )}
    </main>
  )
}
