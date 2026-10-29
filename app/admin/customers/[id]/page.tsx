import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '../../AdminNav'

type Customer = {
  id: string
  name: string
  email: string
  phone: string
  created_at: string
}

type Booking = {
  id: string
  booking_reference: string
  booking_date: string
  start_time: string
  end_time: string
  amount: number
  status: string
  payment_status: string
  court_id: string
}

type Court = {
  id: string
  name: string
}

type PageProps = {
  params: Promise<{
    id: string
  }>
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

export default async function CustomerDetailsPage({
  params,
}: PageProps) {
  const { id } = await params

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
    (profile.role !== 'admin' && profile.role !== 'staff')
  ) {
    redirect('/dashboard')
  }

  const { data: customer, error: customerError } =
    await supabase
      .from('customers')
      .select(
        'id, name, email, phone, created_at'
      )
      .eq('id', id)
      .single()

  if (customerError || !customer) {
    notFound()
  }

  const { data: bookings, error: bookingsError } =
    await supabase
      .from('bookings')
      .select(
        `
          id,
          booking_reference,
          booking_date,
          start_time,
          end_time,
          amount,
          status,
          payment_status,
          court_id
        `
      )
      .eq('customer_id', id)
      .order('booking_date', {
        ascending: false,
      })
      .order('start_time', {
        ascending: false,
      })

  if (bookingsError) {
    console.error(
      'Customer bookings error:',
      bookingsError
    )
  }

  const allBookings = bookings ?? []

  const { data: courts } = await supabase
    .from('courts')
    .select('id, name')

  const courtMap = new Map(
    (courts ?? []).map((court: Court) => [
      court.id,
      court.name,
    ])
  )

  const activeBookings = allBookings.filter(
    (booking: Booking) =>
      booking.status !== 'cancelled'
  )

  const totalSpent = activeBookings.reduce(
    (total, booking) =>
      total + Number(booking.amount || 0),
    0
  )

  return (
    <>
      <AdminNav />

      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">

          {/* Back link */}
          <div className="mb-6">
            <Link
              href="/admin/customers"
              className="text-sm font-semibold text-teal-700 hover:text-blue-700"
            >
              ← Back to Customers
            </Link>
          </div>

          {/* Customer header */}
          <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
              DINKPOINT PANABO · ADMIN
            </p>

            <h1 className="mt-2 text-[32px] font-extrabold tracking-tight text-slate-950">
              {customer.name}
            </h1>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500">
                  Email
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {customer.email || '—'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Phone
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {customer.phone || '—'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Customer Since
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {new Date(
                    customer.created_at
                  ).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">
                Total Bookings
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {activeBookings.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">
                Total Spent
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                ₱{totalSpent.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Booking history */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold text-slate-900">
                Booking History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                All bookings associated with this customer.
              </p>
            </div>

{bookingsError ? (
  <div className="p-10 text-center">
    <h3 className="text-lg font-bold text-red-600">
      Unable to load booking history
    </h3>
    <p className="mt-2 text-slate-600">
      Please check the server terminal for details.
    </p>
  </div>
) : allBookings.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-5xl">
                  🎾
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  No bookings yet
                </h3>

                <p className="mt-2 text-slate-600">
                  This customer has no booking history.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Reference
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Date
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Time
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Court
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Amount
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Status
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                        Payment
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {allBookings.map(
                      (booking: Booking) => (
                        <tr key={booking.id}>
						<td className="px-6 py-4">
						  <Link
							href={`/admin/bookings?booking=${booking.id}`}
							className="font-semibold text-teal-700 hover:text-blue-800 hover:underline"
						  >
							{booking.booking_reference}
						  </Link>
						</td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(
                              booking.booking_date
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatTime(
                              booking.start_time
                            )}{' '}
                            –{' '}
                            {formatTime(
                              booking.end_time
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {courtMap.get(
                              booking.court_id
                            ) ?? 'Unknown Court'}
                          </td>

                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            ₱
                            {Number(
                              booking.amount || 0
                            ).toLocaleString()}
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold">
                              {booking.status}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold">
                              {booking.payment_status}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  )
}