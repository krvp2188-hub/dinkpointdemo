import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingSearch from './BookingSearch'
import AdminNav from '../AdminNav'

type Booking = {
  id: string
  booking_reference: string
  court_id: string
  customer_id: string
  customer_name_at_booking: string | null
  customer_email_at_booking: string | null
  customer_phone_at_booking: string | null
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

type Customer = {
  id: string
  name: string
  email: string
  phone: string
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

type AdminBookingsPageProps = {
  searchParams: Promise<{
    booking?: string
  }>
}

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  const params = await searchParams
  
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check the user's role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    (profile.role !== 'admin' && profile.role !== 'staff')
  ) {
    redirect('/dashboard')
  }

  // Load all bookings
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(
      `
        id,
        booking_reference,
        court_id,
        customer_id,
        customer_name_at_booking,
        customer_email_at_booking,
        customer_phone_at_booking,
        booking_date,
        start_time,
        end_time,
        amount,
        status,
        payment_status,
        created_at
      `
    )
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('ADMIN BOOKINGS ERROR:', error)

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Booking Management
            </h1>

            <p className="mt-3 text-red-600">
              We couldn't load the bookings.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Get court IDs
  const courtIds = Array.from(
    new Set(
      (bookings ?? []).map(
        (booking: Booking) => booking.court_id
      )
    )
  )

  // Get customer IDs
  const customerIds = Array.from(
    new Set(
      (bookings ?? []).map(
        (booking: Booking) => booking.customer_id
      )
    )
  )

  // Load courts
  let courts: Court[] = []

  if (courtIds.length > 0) {
    const { data: courtData } = await supabase
      .from('courts')
      .select('id, name')
      .in('id', courtIds)

    courts = courtData ?? []
  }


  // Load customers
  let customers: Customer[] = []

  if (customerIds.length > 0) {
    const {
      data: customerData,
      error: customerError,
    } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .in('id', customerIds)

    if (customerError) {
      console.error(
        'ADMIN BOOKINGS CUSTOMER QUERY ERROR:',
        customerError
      )
    }

    customers = customerData ?? []

  }


  const courtMap = new Map(
    courts.map((court) => [court.id, court.name])
  )

  const customerMap = new Map(
    customers.map((customer) => [customer.id, customer])
  )

  const bookingRows = (bookings ?? []).map((booking: Booking) => {
    const customer = customerMap.get(booking.customer_id)

    return {
      id: booking.id,
      booking_reference: booking.booking_reference,
      // Prefer the contact details captured for this booking.
      // Fall back to the current customer profile for older bookings.
      customer_name:
        booking.customer_name_at_booking?.trim() ||
        customer?.name ||
        'Unknown Customer',
      customer_email:
        booking.customer_email_at_booking?.trim() ||
        customer?.email ||
        '',
      customer_phone:
        booking.customer_phone_at_booking?.trim() ||
        customer?.phone ||
        '',
      court_name:
        courtMap.get(booking.court_id) ?? 'Unknown Court',
      booking_date: booking.booking_date,
      start_time: formatTime(booking.start_time),
      end_time: formatTime(booking.end_time),
      amount: booking.amount,
      status: booking.status,
      payment_status: booking.payment_status,
      created_at: booking.created_at,
    }
  })

  return (
  
    <>
    <AdminNav />
	
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <p className="font-semibold text-blue-600">
            ADMIN
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Booking Management
          </h1>

          <p className="mt-2 text-slate-600">
            View and manage all court bookings.
          </p>
        </div>

        {/* Booking count */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            Total Bookings
          </p>

          <p className="mt-1 text-3xl font-bold text-slate-900">
            {bookings?.length ?? 0}
          </p>
        </div>

        {/* Empty state */}
        {(!bookings || bookings.length === 0) && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">
              🏓
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No bookings found
            </h2>

            <p className="mt-2 text-slate-600">
              There are currently no bookings in the system.
            </p>
          </div>
        )}

        {/* Search and bookings */}
        {bookings && bookings.length > 0 && (
<BookingSearch
  bookings={bookingRows}
  initialSelectedBookingId={params.booking}
/>
        )}
		
      </div>
    </main>
</>
  )
}