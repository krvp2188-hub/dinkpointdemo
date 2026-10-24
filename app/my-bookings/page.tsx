import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type Booking = {
  id: string
  booking_reference: string
  court_id: string
  booking_date: string
  start_time: string
  end_time: string
  amount: number
  status: string
  payment_status: string
  created_at: string
}

type Court = {
  id: string
  name: string
}

type GroupedBooking = {
  reference: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  hours: number
  totalAmount: number
  status: string
  paymentStatus: string
}

function formatTime(time: string) {
  const [hourString, minute] = time.split(':')
  const hour = Number(hourString)

  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:${minute} ${suffix}`
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-')

  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  )

  return localDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function calculateHours(startTime: string, endTime: string) {
  const startHour = Number(startTime.split(':')[0])
  const endHour = Number(endTime.split(':')[0])

  let hours = endHour - startHour

  if (hours <= 0) {
    hours += 24
  }

  return hours
}

export default async function MyBookingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.customer_id) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              My Bookings
            </h1>

            <p className="mt-3 text-slate-600">
              Your player profile is not linked to a customer account yet.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(
      `
        id,
        booking_reference,
        court_id,
        booking_date,
        start_time,
        end_time,
        amount,
        status,
        payment_status,
        created_at
      `
    )
    .eq('customer_id', profile.customer_id)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('MY BOOKINGS ERROR:', error)

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              My Bookings
            </h1>

            <p className="mt-3 text-red-600">
              We couldn't load your bookings.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const courtIds = Array.from(
    new Set(
      (bookings ?? []).map((booking: Booking) => booking.court_id)
    )
  )

  let courts: Court[] = []

  if (courtIds.length > 0) {
    const { data: courtData } = await supabase
      .from('courts')
      .select('id, name')
      .in('id', courtIds)

    courts = courtData ?? []
  }

  const courtMap = new Map(
    courts.map((court) => [court.id, court.name])
  )

  /*
   * Group hourly database rows into one customer booking.
   *
   * Example:
   *
   * PB-123
   * 10:00–11:00
   * 11:00–12:00
   * 12:00–13:00
   *
   * becomes:
   *
   * PB-123
   * 10:00 AM–1:00 PM
   * 3 hours
   * ₱720
   */
  const bookingGroups = new Map<string, GroupedBooking>()

  for (const booking of (bookings ?? []) as Booking[]) {
    const existing = bookingGroups.get(booking.booking_reference)

    if (!existing) {
      bookingGroups.set(booking.booking_reference, {
        reference: booking.booking_reference,
        courtName:
          courtMap.get(booking.court_id) ?? 'Unknown Court',
        date: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        hours: calculateHours(
          booking.start_time,
          booking.end_time
        ),
        totalAmount: Number(booking.amount) || 0,
        status: booking.status,
        paymentStatus: booking.payment_status,
      })

      continue
    }

    existing.totalAmount += Number(booking.amount) || 0

    existing.hours += calculateHours(
      booking.start_time,
      booking.end_time
    )

    if (booking.start_time < existing.startTime) {
      existing.startTime = booking.start_time
    }

    if (booking.end_time > existing.endTime) {
      existing.endTime = booking.end_time
    }

    /*
     * Keep the most important status.
     * Confirmed takes priority over pending.
     */
    if (booking.status === 'confirmed') {
      existing.status = 'confirmed'
    }

    /*
     * Paid takes priority over unpaid.
     */
    if (booking.payment_status === 'paid') {
      existing.paymentStatus = 'paid'
    }
  }

  const groupedBookings = Array.from(
    bookingGroups.values()
  )

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <p className="font-semibold text-green-600">
            PLAYER ACCOUNT
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            My Bookings
          </h1>

          <p className="mt-2 text-slate-600">
            View your pickleball court reservations and payment status.
          </p>
        </div>

        {/* No bookings */}
        {groupedBookings.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">
              🏓
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No bookings yet
            </h2>

            <p className="mt-2 text-slate-600">
              You haven't made a pickleball court booking yet.
            </p>

            <a
              href="/book"
              className="mt-6 inline-block rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
            >
              Book a Court
            </a>
          </div>
        )}

        {/* Booking list */}
        <div className="space-y-5">

          {groupedBookings.map((booking) => (
            <div
              key={booking.reference}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >

              {/* Top row */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Booking Reference
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {booking.reference}
                  </p>
                </div>

                <span
                  className={
                    booking.status === 'confirmed'
                      ? 'rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700'
                      : 'rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700'
                  }
                >
                  {booking.status === 'confirmed'
                    ? 'Confirmed'
                    : 'Pending'}
                </span>

              </div>

              {/* Details */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">

                <div>
                  <p className="text-sm text-slate-500">
                    Court
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {booking.courtName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Date
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(booking.date)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Time
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatTime(booking.startTime)}
                    {' – '}
                    {formatTime(booking.endTime)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Duration
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {booking.hours}{' '}
                    {booking.hours === 1 ? 'hour' : 'hours'}
                  </p>
                </div>

              </div>

              {/* Total */}
              <div className="mt-6 border-t pt-5">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="text-sm text-slate-500">
                      Payment
                    </p>

                    <p
                      className={
                        booking.paymentStatus === 'paid'
                          ? 'mt-1 font-semibold text-green-600'
                          : 'mt-1 font-semibold text-yellow-600'
                      }
                    >
                      {booking.paymentStatus === 'paid'
                        ? 'Paid'
                        : 'Unpaid'}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-sm text-slate-500">
                      Total
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      ₱{booking.totalAmount.toLocaleString()}
                    </p>
                  </div>

                </div>

              </div>

            </div>
          ))}

        </div>

        {/* Book another */}
        {groupedBookings.length > 0 && (
          <div className="mt-8 text-center">
            <a
              href="/book"
              className="inline-block rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Book Another Court
            </a>
          </div>
        )}

      </div>
    </main>
  )
}