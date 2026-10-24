'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmationContent() {
  const searchParams = useSearchParams()

  const reference = searchParams.get('reference')
  const date = searchParams.get('date')
  const court = searchParams.get('court')
  const time = searchParams.get('time')
  const amount = searchParams.get('amount')

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
            <p className="font-semibold text-yellow-900">
              Payment Pending
            </p>

            <p className="mt-1 text-sm text-yellow-800">
              Your booking has been created. Payment will be completed
              in the next step.
            </p>
          </div>

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