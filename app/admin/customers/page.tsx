import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import CustomerSearch from './CustomerSearch'

type Customer = {
  id: string
  name: string
  email: string
  phone: string
  created_at: string
}

type Booking = {
  customer_id: string
  amount: number
  status: string
}

export default async function AdminCustomersPage() {
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

  const { data: customers, error } = await supabase
    .from('customers')
    .select(
      'id, name, email, phone, created_at'
    )
    .order('name', { ascending: true })
	
const { data: bookings, error: bookingsError } =
  await supabase
    .from('bookings')
    .select(
      'customer_id, amount, status'
    )

if (bookingsError) {
  console.error(
    'Admin customer bookings error:',
    bookingsError
  )
}

  if (error) {
    console.error('Admin customers error:', error)
  }

const customerStats = new Map<
  string,
  {
    bookingCount: number
    totalSpent: number
  }
>()

;(bookings ?? []).forEach(
  (booking: Booking) => {
    if (booking.status === 'cancelled') {
      return
    }

    const existing =
      customerStats.get(
        booking.customer_id
      ) ?? {
        bookingCount: 0,
        totalSpent: 0,
      }

    customerStats.set(
      booking.customer_id,
      {
        bookingCount:
          existing.bookingCount + 1,
        totalSpent:
          existing.totalSpent +
          Number(booking.amount || 0),
      }
    )
  }
)

const customerRows = (customers ?? []).map(
  (customer: Customer) => {
    const stats =
      customerStats.get(customer.id) ?? {
        bookingCount: 0,
        totalSpent: 0,
      }

    return {
      ...customer,
      bookingCount: stats.bookingCount,
      totalSpent: stats.totalSpent,
    }
  }
)

  return (
    <>
      <AdminNav />

      <main
        className="min-h-screen bg-slate-50 px-6 py-12"
      >
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8">
            <p className="font-semibold text-teal-700">
              ADMIN
            </p>

            <h1 className="mt-2 text-[32px] font-extrabold tracking-tight text-slate-950">
              Customer Management
            </h1>

            <p className="mt-2 text-slate-600">
              View customers registered in the booking system.
            </p>
          </div>

          {/* Customer count */}
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Total Customers
            </p>

            <p className="mt-1 text-[32px] font-extrabold tracking-tight text-slate-950">
              {customers?.length ?? 0}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-red-200">
              <p className="font-semibold text-red-600">
                Unable to load customers.
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Please check the server logs for more details.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!error &&
            (!customers || customers.length === 0) && (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <div className="text-5xl">
                  👥
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  No customers found
                </h2>

                <p className="mt-2 text-slate-600">
                  There are currently no customers in the system.
                </p>
              </div>
            )}

          {/* Customer list */}
{customers && customers.length > 0 && (
  <CustomerSearch
    customers={customerRows}
  />
)}

        </div>
      </main>
    </>
  )
}