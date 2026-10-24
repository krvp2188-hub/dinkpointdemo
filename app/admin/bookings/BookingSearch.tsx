'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type BookingRow = {
  id: string
  booking_reference: string
  customer_name: string
  customer_email: string
  court_name: string
  booking_date: string
  start_time: string
  end_time: string
  amount: number
  status: string
  payment_status: string
  created_at: string
}

type Props = {
  bookings: BookingRow[]
  initialSelectedBookingId?: string
}

export default function BookingSearch({
  bookings,
  initialSelectedBookingId,
}: Props) {
  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')

  const [dateFilter, setDateFilter] = useState('')

  const [paymentFilter, setPaymentFilter] = useState('all')

  // Default to newest booking first, then allow alternate sorting.
  const [sortBy, setSortBy] = useState('latest')

const [selectedBooking, setSelectedBooking] =
  useState<BookingRow | null>(null)

useEffect(() => {
  if (!initialSelectedBookingId) return

  const bookingToOpen = bookings.find(
    (booking) =>
      booking.id === initialSelectedBookingId
  )

  if (bookingToOpen) {
    setSelectedBooking(bookingToOpen)
  }
}, [bookings, initialSelectedBookingId])
	
  const [actionLoading, setActionLoading] = useState(false)
	
  const [actionError, setActionError] = useState('')
  
const updateBookingStatus = async (
  status: 'pending' | 'confirmed' | 'cancelled'
) => {
  if (!selectedBooking) return

  setActionLoading(true)
  setActionError('')

  try {
    const supabase = createClient()

    const { error } = await supabase.rpc('update_booking_status', {
      p_booking_id: selectedBooking.id,
      p_status: status,
    })

    if (error) {
      throw error
    }

    setSelectedBooking({
      ...selectedBooking,
      status,
    })
  } catch (error) {
    console.error(error)
    setActionError('Unable to update booking status.')
  } finally {
    setActionLoading(false)
  }
}

const updatePaymentStatus = async (
  paymentStatus: 'paid' | 'unpaid'
) => {
  if (!selectedBooking) return

  setActionLoading(true)
  setActionError('')

  try {
    const supabase = createClient()

    const { error } = await supabase.rpc(
      'update_booking_payment_status',
      {
        p_booking_id: selectedBooking.id,
        p_payment_status: paymentStatus,
      }
    )

    if (error) {
      throw error
    }

    setSelectedBooking({
      ...selectedBooking,
      payment_status: paymentStatus,
    })
  } catch (error) {
    console.error(error)
    setActionError('Unable to update payment status.')
  } finally {
    setActionLoading(false)
  }
}

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = bookings.filter((booking) => {
      const matchesSearch =
        !query ||
        booking.booking_reference
          .toLowerCase()
          .includes(query) ||
        booking.customer_name
          .toLowerCase()
          .includes(query) ||
        booking.customer_email
          .toLowerCase()
          .includes(query) ||
        booking.court_name
          .toLowerCase()
          .includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        booking.status === statusFilter

      const matchesDate =
        !dateFilter ||
        booking.booking_date === dateFilter

      const matchesPayment =
        paymentFilter === 'all' ||
        booking.payment_status === paymentFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate &&
        matchesPayment
      )
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.customer_name.localeCompare(b.customer_name, undefined, { sensitivity: 'base' })
      }
      if (sortBy === 'oldest') {
        return a.created_at.localeCompare(b.created_at)
      }
      if (sortBy === 'date-ascending') {
        return a.booking_date.localeCompare(b.booking_date) || a.start_time.localeCompare(b.start_time)
      }
      // Latest booking created first.
      return b.created_at.localeCompare(a.created_at)
    })
  }, [bookings, search, statusFilter, dateFilter, paymentFilter, sortBy])

  return (
    <div>
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <label
          htmlFor="booking-search"
          className="block text-sm font-semibold text-slate-700"
        >
          Search bookings
        </label>

        <input
          id="booking-search"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Reference, customer, email, or court..."
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-4">
          <label
            htmlFor="booking-sort"
            className="block text-sm font-semibold text-slate-700"
          >
            Sort bookings
          </label>
          <select
            id="booking-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="latest">Latest booking date first</option>
            <option value="oldest">Oldest booking date first</option>
            <option value="date-ascending">Upcoming dates first</option>
            <option value="alphabetical">Customer name (A–Z)</option>
          </select>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </p>

        <div className="mt-4">
          <label
            htmlFor="booking-date"
            className="block text-sm font-semibold text-slate-700"
          >
            Filter by date
          </label>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id="booking-date"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'pending', label: 'Pending' },
            { value: 'cancelled', label: 'Cancelled' },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={
                statusFilter === filter.value
                  ? 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200'
              }
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All Payments' },
            { value: 'paid', label: 'Paid' },
            { value: 'unpaid', label: 'Unpaid' },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setPaymentFilter(filter.value)}
              className={
                paymentFilter === filter.value
                  ? 'rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200'
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-4xl">
            🔎
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            No matching bookings
          </h2>

          <p className="mt-2 text-slate-600">
            Try a different reference, customer, email, or court.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                    Reference
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                    Court
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                    Date
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                    Time
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                    Status
                  </th>

                  <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                    Payment
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {booking.booking_reference}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {booking.customer_name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {booking.customer_email}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-900">
                      {booking.court_name}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      {booking.booking_date}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                      {booking.start_time} – {booking.end_time}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                      ₱{Number(booking.amount).toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      {booking.status}
                    </td>

                    <td className="px-5 py-4">
                      {booking.payment_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Booking Details
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedBooking.booking_reference}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {selectedBooking.customer_name}
                </p>

                <p className="text-sm text-slate-600">
                  {selectedBooking.customer_email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Court
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedBooking.court_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedBooking.booking_date}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Time
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedBooking.start_time} – {selectedBooking.end_time}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amount
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    ₱{Number(selectedBooking.amount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Booking Status
                  </p>

                  <p className="mt-1 font-medium capitalize text-slate-900">
                    {selectedBooking.status}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Payment Status
                  </p>

                  <p className="mt-1 font-medium capitalize text-slate-900">
                    {selectedBooking.payment_status}
                  </p>
                </div>
              </div>
            </div>

<div className="border-t px-6 py-4">
  {actionError && (
    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {actionError}
    </div>
  )}

  <div className="mb-4">
    <p className="mb-2 text-sm font-semibold text-slate-700">
      Booking Status
    </p>

    <div className="flex flex-wrap gap-2">
      {selectedBooking.status !== 'confirmed' && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => updateBookingStatus('confirmed')}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm Booking
        </button>
      )}

      {selectedBooking.status !== 'cancelled' && (

<button
  type="button"
  disabled={actionLoading}
  onClick={() => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking?'
    )

    if (confirmed) {
      updateBookingStatus('cancelled')
    }
  }}
  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
>
  Cancel Booking
</button>

      )}

      {selectedBooking.status !== 'pending' && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => updateBookingStatus('pending')}
          className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Set Pending
        </button>
      )}
    </div>
  </div>

  <div className="mb-5">
    <p className="mb-2 text-sm font-semibold text-slate-700">
      Payment Status
    </p>

    <div className="flex flex-wrap gap-2">
      {selectedBooking.payment_status !== 'paid' && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => updatePaymentStatus('paid')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark as Paid
        </button>
      )}

      {selectedBooking.payment_status !== 'unpaid' && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => updatePaymentStatus('unpaid')}
          className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark as Unpaid
        </button>
      )}
    </div>
  </div>

  <div className="flex justify-end">
    <button
      type="button"
      onClick={() => setSelectedBooking(null)}
      className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
    >
      Close
    </button>
  </div>
</div>
			
          </div>
        </div>
      )}
    </div>
  )
}