import { redirect } from 'next/navigation'
import Link from 'next/link'
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
      <main
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '32px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            marginBottom:
              '32px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Staff Dashboard
            </h1>

            <p
              style={{
                marginTop: '8px',
                color: '#666',
              }}
            >
              Manage bookings and
              payments.
            </p>
          </div>

          <Link
            href="/book"
            style={{
              padding:
                '12px 18px',
              borderRadius: '8px',
              background:
                '#111827',
              color: 'white',
              textDecoration:
                'none',
            }}
          >
            Booking Page
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom:
              '32px',
          }}
        >
          <DashboardCard
            title="Today's Bookings"
            value={
              todaysBookings.length
            }
          />

          <DashboardCard
            title="Pending Payments"
            value={
              pendingPayments.length
            }
          />

          <DashboardCard
            title="Confirmed Bookings"
            value={
              confirmedBookings.length
            }
          />
        </div>

        {/* Keep receipt review on the main staff bookings page. */}
        <PaymentReceiptReview />
        <section
          style={{
            background:
              'white',
            borderRadius:
              '12px',
            padding:
              '24px',
            boxShadow:
              '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom:
                '20px',
            }}
          >
            Bookings
          </h2>

          <BookingFilters
            bookings={
              filterBookings
            }
          />

        </section>
      </div>
      </main>
    </>
  )
}

function DashboardCard({
  title,
  value,
}: {
  title: string
  value: number
}) {
  return (
    <div
      style={{
        background:
          'white',
        borderRadius:
          '12px',
        padding:
          '20px',
        boxShadow:
          '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          color: '#666',
          fontSize:
            '14px',
          marginBottom:
            '8px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            '28px',
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  )
}