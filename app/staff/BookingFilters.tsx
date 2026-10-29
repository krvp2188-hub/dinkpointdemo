'use client'

import { useMemo, useState } from 'react'
import BookingActions from './BookingActions'

type Receipt = {
  id: string
  bookingReference: string
  transactionReference: string
  submittedAt: string
  status: string
  staffNote: string | null
  imageUrl: string | null
}

type Booking = {
  booking_reference: string
  customer_name: string
  customer_phone: string
  customer_email: string
  court_name: string
  booking_date: string
  start_time: string
  end_time: string
  total_amount: number
  hours: number
  status: string
  payment_status: string
  payment_reference: string | null
}

export default function BookingFilters({
  bookings,
}: {
  bookings: Booking[]
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filteredBookings = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      const matchesSearch =
        !searchText ||
        booking.booking_reference.toLowerCase().includes(searchText) ||
        booking.customer_name.toLowerCase().includes(searchText) ||
        booking.customer_phone.toLowerCase().includes(searchText) ||
        booking.customer_email.toLowerCase().includes(searchText)

      if (!matchesSearch) return false

      if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0]
        return booking.booking_date === today
      }

      if (filter === 'upcoming') {
        const today = new Date().toISOString().split('T')[0]
        return booking.booking_date >= today && booking.status !== 'cancelled'
      }

      if (filter === 'pending') return booking.status === 'pending'

      if (filter === 'unpaid') {
        return booking.payment_status !== 'paid' && booking.status !== 'cancelled'
      }

      if (filter === 'confirmed') return booking.status === 'confirmed'
      if (filter === 'completed') return booking.status === 'completed'
      if (filter === 'cancelled') return booking.status === 'cancelled'

      return true
    })
  }, [bookings, search, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search bookings</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
          <input
            type="search"
            placeholder="Search booking, customer, phone or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="sm:w-52">
          <span className="sr-only">Filter bookings</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            <option value="all">All bookings</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="pending">Pending</option>
            <option value="unpaid">Unpaid</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 sm:text-sm">
        <span>Showing <strong className="text-slate-800">{filteredBookings.length}</strong> of {bookings.length} bookings</span>
        {(search || filter !== 'all') && (
          <button type="button" onClick={() => { setSearch(''); setFilter('all') }} className="rounded-lg px-2 py-1 font-semibold text-teal-700 hover:bg-teal-50">
            Clear filters
          </button>
        )}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
          <p className="font-semibold text-slate-700">No bookings found</p>
          <p className="mt-1 text-sm text-slate-500">Try changing your search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filteredBookings.map((booking) => (
            <BookingCard key={booking.booking_reference} booking={booking} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({
  booking,
}: {
  booking: Booking
}) {
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [receiptLoaded, setReceiptLoaded] = useState(false)

  async function openReceiptViewer() {
    setReceiptOpen(true)
    setReceiptError('')
    if (receiptLoaded) return

    setReceiptLoading(true)
    try {
      const response = await fetch(
        `/api/pending-receipts?reference=${encodeURIComponent(booking.booking_reference)}`,
        { cache: 'no-store' }
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not load receipt.')

      const matching = (payload.receipts ?? []).filter(
        (receipt: Receipt) => receipt.bookingReference === booking.booking_reference
      )
      setReceipts(matching)
      setReceiptLoaded(true)
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : 'Could not load receipt.')
    } finally {
      setReceiptLoading(false)
    }
  }

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Booking reference</p>
          <p className="mt-1 break-all text-sm font-bold text-slate-900 sm:text-base">{booking.booking_reference}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={booking.status} />
          <StatusBadge label={booking.payment_status} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <InfoItem label="Customer" value={booking.customer_name} />
        <InfoItem label="Phone" value={booking.customer_phone} />
        <InfoItem label="Email" value={booking.customer_email} />
        <InfoItem label="Court" value={booking.court_name} />
        <InfoItem label="Date" value={booking.booking_date} />
        <InfoItem label="Time" value={`${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`} />
        <InfoItem label="Duration" value={`${booking.hours} ${booking.hours === 1 ? 'hour' : 'hours'}`} />
        <InfoItem label="Total" value={`₱${booking.total_amount.toLocaleString()}`} />
        {booking.payment_reference && <InfoItem label="Payment Reference" value={booking.payment_reference} />}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <BookingActions
            bookingReference={booking.booking_reference}
            status={booking.status}
            paymentStatus={booking.payment_status}
          />
        </div>
        {/* Keep this per-booking receipt viewer visible on mobile and desktop. */}
        <button
          type="button"
          onClick={openReceiptViewer}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 sm:ml-auto sm:w-auto"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M8 13h5"/></svg>
          View GCash Receipt
        </button>
      </div>

      {receiptOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`GCash receipt for ${booking.booking_reference}`}
          onClick={() => setReceiptOpen(false)}
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-5"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 text-slate-900 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold sm:text-xl">Submitted GCash Receipt</h2>
                <p className="mt-1 break-all text-xs text-slate-500">{booking.booking_reference}</p>
              </div>
              <button type="button" onClick={() => setReceiptOpen(false)} aria-label="Close receipt viewer" className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-200">
                Close
              </button>
            </div>

            {receiptLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">Loading receipt...</div>
            ) : receiptError ? (
              <p role="alert" className="py-6 text-sm text-red-700">{receiptError}</p>
            ) : receipts.length === 0 ? (
              <p className="py-8 text-sm text-slate-500">No receipt submitted for this booking.</p>
            ) : (
              <div className="mt-5 space-y-6">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="border-t border-slate-200 pt-4">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div><strong>Status:</strong> <span className="capitalize">{receipt.status}</span></div>
                      <div className="break-words"><strong>GCash reference:</strong> {receipt.transactionReference || 'Not provided'}</div>
                      <div><strong>Submitted:</strong> {new Date(receipt.submittedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</div>
                      {receipt.staffNote && <div className="sm:col-span-2"><strong>Staff note:</strong> {receipt.staffNote}</div>}
                    </div>
                    {receipt.imageUrl ? (
                      <>
                        <a href={receipt.imageUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-teal-700 underline">Open image in a new tab</a>
                        <img src={receipt.imageUrl} alt={`GCash receipt for ${booking.booking_reference}`} className="mt-3 block max-h-[60vh] w-full rounded-xl border border-slate-200 object-contain" />
                      </>
                    ) : (
                      <p className="mt-4 text-sm text-red-700">The receipt image could not be opened. Please check that the stored file still exists.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-800">{value}</div>
    </div>
  )
}

function StatusBadge({ label }: { label: string }) {
  const normalized = label.toLowerCase()
  const color =
    ['paid', 'confirmed', 'completed', 'approved'].includes(normalized)
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : ['pending', 'unpaid'].includes(normalized)
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : ['cancelled', 'failed', 'rejected'].includes(normalized)
          ? 'bg-rose-50 text-rose-700 ring-rose-200'
          : 'bg-slate-100 text-slate-700 ring-slate-200'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${color}`}>
      {label}
    </span>
  )
}

function formatTime(time: string) {
  const [hourString, minute] = time.split(':')
  let hour = Number(hourString)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  if (hour === 0) hour = 12
  else if (hour > 12) hour -= 12
  return `${hour}:${minute} ${suffix}`
}
