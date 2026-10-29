import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BookingFilters from './BookingFilters'
import PaymentReceiptReview from './PaymentReceiptReview'
import StaffAutoRefresh from './StaffAutoRefresh'

type Booking = {
  id: string
  booking_reference: string
  customer_id: string
  booking_date: string
  start_time: string
  end_time: string
  amount: number
  status: string
  payment_status: string
  payment_reference: string | null
  created_at: string
  court_id: string
}

type GroupedBooking = {
  booking_reference: string
  customer_id: string
  court_id: string
  booking_date: string
  start_time: string
  end_time: string
  total_amount: number
  hours: number
  status: string
  payment_status: string
  payment_reference: string | null
  created_at: string
}

export default async function StaffPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    (profile.role !== 'staff' &&
      profile.role !== 'admin')
  ) {
    redirect('/')
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_reference,
      customer_id,
      booking_date,
      start_time,
      end_time,
      amount,
      status,
      payment_status,
      payment_reference,
      created_at,
      court_id
    `)
    // Show the newest-created bookings first in the staff dashboard.
    .order('created_at', { ascending: false })
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Staff bookings error:', error)
  }

  const allBookings =
    (bookings ?? []) as Booking[]

  /*
   * Group hourly rows by booking reference.
   */
  const bookingMap =
    new Map<string, GroupedBooking>()

  for (const booking of allBookings) {
    const existing = bookingMap.get(
      booking.booking_reference
    )

    if (!existing) {
      bookingMap.set(
        booking.booking_reference,
        {
          booking_reference:
            booking.booking_reference,
          customer_id: booking.customer_id,
          court_id: booking.court_id,
          booking_date:
            booking.booking_date,
          start_time:
            booking.start_time,
          end_time:
            booking.end_time,
          total_amount:
            Number(booking.amount || 0),
          hours: 1,
          status: booking.status,
          payment_status:
            booking.payment_status,
          payment_reference:
            booking.payment_reference,
          created_at:
            booking.created_at,
        }
      )

      continue
    }

    existing.total_amount +=
      Number(booking.amount || 0)

    existing.hours += 1

    if (
      booking.start_time <
      existing.start_time
    ) {
      existing.start_time =
        booking.start_time
    }

    if (
      booking.end_time >
      existing.end_time
    ) {
      existing.end_time =
        booking.end_time
    }

    /*
     * The booking is considered paid only
     * when all hourly rows are paid.
     */
    if (
      booking.payment_status !== 'paid'
    ) {
      existing.payment_status =
        booking.payment_status
    }

    const statusPriority: Record<
      string,
      number
    > = {
      pending: 1,
      confirmed: 2,
      completed: 3,
      cancelled: 4,
    }

    if (
      (statusPriority[booking.status] || 0) >
      (statusPriority[existing.status] || 0)
    ) {
      existing.status =
        booking.status
    }

    if (
      !existing.payment_reference &&
      booking.payment_reference
    ) {
      existing.payment_reference =
        booking.payment_reference
    }
  }

  const groupedBookings =
    Array.from(bookingMap.values())

  /*
   * Customers
   */
  const customerIds = [
    ...new Set(
      groupedBookings.map(
        (booking) =>
          booking.customer_id
      )
    ),
  ]

  const { data: customers } =
    customerIds.length
      ? await supabase
          .from('customers')
          .select(
            'id, name, email, phone'
          )
          .in(
            'id',
            customerIds
          )
      : { data: [] }

  const customerMap =
    new Map(
      (customers ?? []).map(
        (customer) => [
          customer.id,
          customer,
        ]
      )
    )

  /*
   * Courts
   */
  const courtIds = [
    ...new Set(
      groupedBookings.map(
        (booking) =>
          booking.court_id
      )
    ),
  ]

  const { data: courts } =
    courtIds.length
      ? await supabase
          .from('courts')
          .select(
            'id, name'
          )
          .in(
            'id',
            courtIds
          )
      : { data: [] }

  const courtMap =
    new Map(
      (courts ?? []).map(
        (court) => [
          court.id,
          court.name,
        ]
      )
    )

  /*
   * Convert to data needed by client component.
   */
  const filterBookings =
    groupedBookings.map(
      (booking) => {
        const customer =
          customerMap.get(
            booking.customer_id
          )

        return {
          booking_reference:
            booking.booking_reference,

          customer_name:
            customer?.name ||
            'Unknown Customer',

          customer_phone:
            customer?.phone ||
            'No phone',

          customer_email:
            customer?.email ||
            'No email',

          court_name:
            courtMap.get(
              booking.court_id
            ) ||
            'Unknown Court',

          booking_date:
            booking.booking_date,

          start_time:
            booking.start_time,

          end_time:
            booking.end_time,

          total_amount:
            booking.total_amount,

          hours:
            booking.hours,

          status:
            booking.status,

          payment_status:
            booking.payment_status,

          payment_reference:
            booking.payment_reference,
        }
      }
    )

  const today =
    new Date()
      .toISOString()
      .split('T')[0]

  const todaysBookings =
    groupedBookings.filter(
      (booking) =>
        booking.booking_date ===
        today
    )

  const pendingPayments =
    groupedBookings.filter(
      (booking) =>
        booking.payment_status !==
          'paid' &&
        booking.status !==
          'cancelled'
    )

  const confirmedBookings =
    groupedBookings.filter(
      (booking) =>
        booking.status ===
        'confirmed'
    )

  return (
    <>
      <StaffAutoRefresh />
      <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">DinkPoint Panabo · Staff</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Staff Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">Manage bookings, payments, and customer transactions.</p>
            </div>
            <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:block">
              Staff workspace
            </div>
          </header>

          <section aria-label="Booking statistics" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:mb-8 lg:grid-cols-3">
            <DashboardCard title="Today's Bookings" value={todaysBookings.length} accent="blue" />
            <DashboardCard title="Pending Payments" value={pendingPayments.length} accent="amber" />
            <DashboardCard title="Confirmed Bookings" value={confirmedBookings.length} accent="green" />
          </section>

          {/* Keep the existing receipt approval/rejection workflow on this page. */}
          <PaymentReceiptReview />

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-6">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Bookings</h2>
                <p className="mt-1 text-sm text-slate-500">Search, review, and manage reservations.</p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-700">
                {filterBookings.length} bookings
              </span>
            </div>
            <div className="p-3 sm:p-5">
              <BookingFilters bookings={filterBookings} />
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function DashboardCard({
  title,
  value,
  accent,
}: {
  title: string
  value: number
  accent: 'blue' | 'amber' | 'green'
}) {
  const styles = {
    blue: { icon: 'bg-sky-100 text-sky-700', value: 'text-slate-900', border: 'border-sky-100', label: 'Bookings today' },
    amber: { icon: 'bg-amber-100 text-amber-700', value: 'text-amber-700', border: 'border-amber-100', label: 'Awaiting payment' },
    green: { icon: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-700', border: 'border-emerald-100', label: 'Successfully confirmed' },
  }[accent]

  return (
    <article className={`rounded-2xl border ${styles.border} bg-white p-4 shadow-sm sm:p-5`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          {accent === 'blue' ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
          ) : accent === 'amber' ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className={`mt-1 text-3xl font-extrabold tracking-tight ${styles.value}`}>{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{styles.label}</p>
    </article>
  )
}
