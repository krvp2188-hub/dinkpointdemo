'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function ConfirmationContent() {
  const searchParams = useSearchParams()

  const reference = searchParams.get('reference')
  const date = searchParams.get('date')
  const court = searchParams.get('court')
  const time = searchParams.get('time')
  const amount = searchParams.get('amount')
  const [transactionReference, setTransactionReference] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  // Calculate the number of booked hours from the time range.
  const getDuration = () => {
    if (!time) {
      return 0
    }

    const parts = time.split('–')

    if (parts.length !== 2) {
      return 0
    }

    const start = parts[0]
    const end = parts[1]

    const startHour = parseInt(start.split(':')[0], 10)
    const endHour = parseInt(end.split(':')[0], 10)

    if (isNaN(startHour) || isNaN(endHour)) {
      return 0
    }

    let duration = endHour - startHour

    // Handles bookings that cross midnight.
    if (duration <= 0) {
      duration += 24
    }

    return duration
  }

  const duration = getDuration()

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">

        <div className="rounded-2xl bg-white p-8 shadow-sm">

          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl text-green-600">
                ✓
              </span>
            </div>

            <h1 className="mt-6 text-3xl font-bold text-gray-900">
              Booking Confirmed!
            </h1>

            <p className="mt-2 text-gray-600">
              Your pickleball court has been successfully reserved.
            </p>
          </div>

          <div className="mt-8 rounded-xl bg-gray-50 p-6">

            <h2 className="text-lg font-bold text-gray-900">
              Booking Details
            </h2>

            <div className="mt-5 space-y-4">

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Booking Reference
                </span>

                <span className="font-bold text-gray-900">
                  {reference || '—'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Date
                </span>

                <span className="font-semibold text-gray-900">
                  {date || '—'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Court
                </span>

                <span className="font-semibold text-gray-900">
                  {court || '—'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Time
                </span>

                <span className="font-semibold text-gray-900">
                  {time || '—'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Duration
                </span>

                <span className="font-semibold text-gray-900">
                  {duration > 0
                    ? `${duration} ${duration === 1 ? 'hour' : 'hours'}`
                    : '—'}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-gray-900">
                    Total
                  </span>

                  <span className="text-xl font-bold text-gray-900">
                    ₱{amount || '0'}
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-5">
            <p className="font-semibold text-yellow-900">Payment Pending</p>
            <p className="mt-1 text-sm text-yellow-800">
              Pay using the GCash QR code below, then submit your transaction reference and receipt.
              Your payment remains unpaid until staff verifies the transaction.
            </p>
          </div>

          <section className="mt-8 rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">Pay with GCash</h2>
            <p className="mt-2 text-sm text-gray-600">
              Scan this QR code using GCash and pay the exact total shown above. Confirm the recipient name in GCash before sending.
            </p>
            <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
              <img src="/images/QR.png" alt="Dink Point  GCash QR code" className="max-h-80 w-auto object-contain" />
            </div>

            {success ? (
              <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800" role="status">
                <p className="font-semibold">Receipt submitted successfully.</p>
                <p className="mt-1 text-sm">Your payment is awaiting staff verification. Your booking has not been marked paid automatically.</p>
              </div>
            ) : (
              <form
                className="mt-6 space-y-5"
                onSubmit={async (event) => {
                  event.preventDefault()
                  setMessage('')

                  if (!reference) {
                    setMessage('The booking reference is missing. Please contact staff before submitting payment proof.')
                    return
                  }
                  if (!receipt) {
                    setMessage('Please choose your GCash receipt image.')
                    return
                  }
                  if (receipt.size > 5 * 1024 * 1024) {
                    setMessage('The receipt image must be 5 MB or smaller.')
                    return
                  }
                  if (!['image/jpeg', 'image/png', 'image/webp'].includes(receipt.type)) {
                    setMessage('Please upload a JPG, PNG, or WebP image.')
                    return
                  }

                  setSubmitting(true)
                  try {
                    const formData = new FormData()
                    formData.append('bookingReference', reference)
                    formData.append('transactionReference', transactionReference.trim())
                    formData.append('receipt', receipt)

                    const response = await fetch('/api/payment-receipt', {
                      method: 'POST',
                      body: formData,
                    })
                    const result = await response.json()
                    if (!response.ok) {
                      throw new Error(result.error || 'Receipt submission failed.')
                    }
                    setSuccess(true)
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Receipt submission failed. Please try again.')
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                <div>
                  <label htmlFor="transactionReference" className="block text-sm font-semibold text-gray-800">
                    GCash transaction reference number <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="transactionReference"
                    name="transactionReference"
                    required
                    minLength={4}
                    maxLength={100}
                    value={transactionReference}
                    onChange={(event) => setTransactionReference(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900"
                    placeholder="Enter the reference from your GCash receipt"
                  />
                </div>

                <div>
                  <label htmlFor="receipt" className="block text-sm font-semibold text-gray-800">
                    Upload GCash receipt <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="receipt"
                    name="receipt"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
                    className="mt-2 block w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP; maximum 5 MB.</p>
                </div>

                {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Submitting receipt…' : 'Submit Payment Receipt'}
                </button>
                <p className="text-xs leading-5 text-gray-500">
                  Uploading a receipt is not proof of payment. Staff will verify the transaction in GCash before updating your booking.
                </p>
              </form>
            )}
          </section>

          <div className="mt-8 text-center">
            <a
              href="/book"
              className="inline-block rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
            >
              Book Another Court
            </a>
          </div>

        </div>

      </div>
    </main>
  )
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 p-8">
          <p>Loading confirmation...</p>
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  )
}