'use client'

import { useMemo, useState } from 'react'
import BookingActions from './BookingActions'

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
        booking.booking_reference
          .toLowerCase()
          .includes(searchText) ||
        booking.customer_name
          .toLowerCase()
          .includes(searchText) ||
        booking.customer_phone
          .toLowerCase()
          .includes(searchText) ||
        booking.customer_email
          .toLowerCase()
          .includes(searchText)

      if (!matchesSearch) {
        return false
      }

      if (filter === 'today') {
        const today = new Date()
          .toISOString()
          .split('T')[0]

        return booking.booking_date === today
      }

      if (filter === 'upcoming') {
        const today = new Date()
          .toISOString()
          .split('T')[0]

        return (
          booking.booking_date >= today &&
          booking.status !== 'cancelled'
        )
      }

      if (filter === 'pending') {
        return booking.status === 'pending'
      }

      if (filter === 'unpaid') {
        return (
          booking.payment_status !== 'paid' &&
          booking.status !== 'cancelled'
        )
      }

      if (filter === 'confirmed') {
        return booking.status === 'confirmed'
      }

      if (filter === 'completed') {
        return booking.status === 'completed'
      }

      if (filter === 'cancelled') {
        return booking.status === 'cancelled'
      }

      return true
    })
  }, [bookings, search, filter])

  return (
    <>
      {/* Search + filters */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <input
          type="search"
          placeholder="Search booking, customer, phone or email..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          style={{
            flex: '1 1 300px',
            minWidth: '250px',
            padding: '12px 14px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
          }}
        />

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
          style={{
            padding: '12px 14px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: 'white',
            fontSize: '14px',
            cursor: 'pointer',
          }}
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
      </div>

      <div
        style={{
          marginBottom: '16px',
          color: '#666',
          fontSize: '14px',
        }}
      >
        Showing {filteredBookings.length} of{' '}
        {bookings.length} bookings
      </div>

      {filteredBookings.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#666',
            border: '1px dashed #ddd',
            borderRadius: '10px',
          }}
        >
          No bookings found.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '16px',
          }}
        >
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.booking_reference}
              booking={booking}
            />
          ))}
        </div>
      )}
    </>
  )
}

function BookingCard({
  booking,
}: {
  booking: Booking
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#777',
              marginBottom: '4px',
            }}
          >
            Booking Reference
          </div>

          <strong>{booking.booking_reference}</strong>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <StatusBadge label={booking.status} />

          <StatusBadge
            label={booking.payment_status}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '18px',
          marginTop: '20px',
        }}
      >
        <InfoItem
          label="Customer"
          value={booking.customer_name}
        />

        <InfoItem
          label="Phone"
          value={booking.customer_phone}
        />

        <InfoItem
          label="Email"
          value={booking.customer_email}
        />

        <InfoItem
          label="Court"
          value={booking.court_name}
        />

        <InfoItem
          label="Date"
          value={booking.booking_date}
        />

        <InfoItem
          label="Time"
          value={`${formatTime(
            booking.start_time
          )} – ${formatTime(booking.end_time)}`}
        />

        <InfoItem
          label="Duration"
          value={`${booking.hours} ${
            booking.hours === 1 ? 'hour' : 'hours'
          }`}
        />

        <InfoItem
          label="Total"
          value={`₱${booking.total_amount.toLocaleString()}`}
        />

        {booking.payment_reference && (
          <InfoItem
            label="Payment Reference"
            value={booking.payment_reference}
          />
        )}
      </div>

      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #eee',
        }}
      >
        <BookingActions
          bookingReference={booking.booking_reference}
          status={booking.status}
          paymentStatus={booking.payment_status}
        />
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <div
        style={{
          fontSize: '12px',
          color: '#777',
          marginBottom: '4px',
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 500,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function StatusBadge({
  label,
}: {
  label: string
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 9px',
        borderRadius: '999px',
        background: '#f3f4f6',
        fontSize: '12px',
        textTransform: 'capitalize',
      }}
    >
      {label}
    </span>
  )
}

function formatTime(time: string) {
  const [hourString, minute] = time.split(':')
  let hour = Number(hourString)

  const suffix = hour >= 12 ? 'PM' : 'AM'

  if (hour === 0) {
    hour = 12
  } else if (hour > 12) {
    hour -= 12
  }

  return `${hour}:${minute} ${suffix}`
}