
'use client'

import { useEffect, useState, type FormEvent } from 'react'

type PaymentSession = {
  bookingReference: string
  totalAmount: number
  bookingDate: string
  slots: { startTime: string; status: string }[]
  paymentStatus: 'paid' | 'cancelled' | 'unpaid'
}

export default function BookingPaymentPage() {
  const [token, setToken] = useState('')
  const [session, setSession] = useState<PaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const guestToken = window.location.hash.startsWith('#token=')
      ? window.location.hash.slice(7)
      : ''
    const reference = new URLSearchParams(window.location.search)
      .get('reference') || ''

    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    )

    setToken(guestToken)

    async function loadSession() {
      if (!guestToken || !reference) {
        setError('This payment link is missing information. Please use your original booking link.')
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
        setError('Unable to connect. Please check your internet and try again.')
      } finally {
        setLoading(false)
      }
    }

    void loadSession()
  }, [])

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
      formData.append('transactionReference', transactionReference.trim())
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
    return <main className="mx-auto max-w-lg p-6">Verifying your booking...</main>
  }

  if (error || !session || !token) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-2xl font-bold">Booking Payment</h1>
        <p className="mt-4 text-red-600">
          {error || 'This payment link is invalid or expired.'}
        </p>
      </main>
    )
  }

  const dateLabel = new Date(
    `${session.bookingDate}T00:00:00`
  ).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-3xl font-bold">Complete Your Booking</h1>

      <section className="mt-5 rounded-xl border p-4">
        <p className="text-sm text-gray-500">Booking reference</p>
        <p className="font-semibold">{session.bookingReference}</p>

        <p className="mt-4 text-sm text-gray-500">Booking date</p>
        <p className="font-medium">{dateLabel}</p>

        <p className="mt-4 text-sm text-gray-500">Selected time slots</p>
        <p className="font-medium">
          {session.slots.map(slot => slot.startTime).join(', ')}
        </p>

        <p className="mt-4 text-sm text-gray-500">Total amount</p>
        <p className="text-3xl font-bold">
          ₱{session.totalAmount.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </section>

      {session.paymentStatus === 'paid' ? (
        <section className="mt-6 rounded-xl border p-4">
          <h2 className="text-xl font-semibold">Payment received</h2>
          <p className="mt-2">
            Your payment has been recorded. Keep your booking reference for inquiries.
          </p>
        </section>
      ) : session.paymentStatus === 'cancelled' ? (
        <p className="mt-6 rounded-xl border p-4">
          This booking has been cancelled. Please contact staff if you believe this is an error.
        </p>
      ) : (
        <>
          <section className="mt-6 rounded-xl border p-4">
            <h2 className="text-xl font-semibold">Pay with GCash</h2>
            <img
              src="/images/QR.png"
              alt="Drink Point Pickleball GCash QR code"
              className="mx-auto mt-4 w-full max-w-xs"
            />
            <p className="mt-4 text-sm text-gray-600">
              Pay the exact total shown above. Check the recipient details in GCash before confirming.
            </p>
          </section>

          <form
            onSubmit={submitReceipt}
            className="mt-6 space-y-4 rounded-xl border p-4"
          >
            <h2 className="text-xl font-semibold">Submit Payment Receipt</h2>

            <div>
              <label htmlFor="transactionReference" className="mb-1 block text-sm font-medium">
                GCash transaction reference
              </label>
              <input
                id="transactionReference"
                name="transactionReference"
                value={transactionReference}
                onChange={event => setTransactionReference(event.target.value)}
                required
                minLength={4}
                maxLength={100}
                autoComplete="off"
                className="w-full rounded-lg border p-3"
                placeholder="Enter your transaction reference"
              />
            </div>

            <div>
              <label htmlFor="receipt" className="mb-1 block text-sm font-medium">
                Receipt image (JPG, PNG, or WebP; max 5 MB)
              </label>
              <input
                id="receipt"
                name="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={event => setReceipt(event.target.files?.[0] || null)}
                className="w-full rounded-lg border p-3"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Receipt'}
            </button>

            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}

            <p className="text-sm text-gray-500">
              Your booking remains unconfirmed until staff verifies the actual GCash transaction.
            </p>
          </form>
        </>
      )}
    </main>
  )
}
