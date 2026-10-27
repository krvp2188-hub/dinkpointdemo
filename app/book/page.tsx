'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Court = {
  id: string
  name: string
  description: string | null
  price_per_hour: number
  status: string
}

type Booking = {
  court_id: string
  start_time: string
  status: string
}

function formatTime(time: string): string {
  const [hours, minutes = '00'] = time.split(':')
  const hour = Number(hours)

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return time
  }

  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:${minutes} ${period}`
}

export default function BookingPage() {
  const router = useRouter()

  const [courts, setCourts] = useState<Court[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<{ courtId: string; time: string }[]>([])

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [bookingReference, setBookingReference] = useState('')
  
  const [operatingHoursLoading, setOperatingHoursLoading] =
  useState(true)
  
  const [operatingHours, setOperatingHours] = useState<{
  open_time: string
  close_time: string
  is_open: boolean
} | null>(null)

  const timeSlots = [
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
    '23:00',
    '00:00',
    '01:00',
  ]

const isTimeWithinOperatingHours = (
  time: string,
  openTime: string,
  closeTime: string
) => {
  const timeMinutes =
    Number(time.split(':')[0]) * 60 +
    Number(time.split(':')[1])

  const openMinutes =
    Number(openTime.split(':')[0]) * 60 +
    Number(openTime.split(':')[1])

  const closeMinutes =
    Number(closeTime.split(':')[0]) * 60 +
    Number(closeTime.split(':')[1])

  // Normal schedule, e.g. 08:00 → 22:00
  if (openMinutes < closeMinutes) {
    return timeMinutes >= openMinutes && timeMinutes < closeMinutes
  }

  // Overnight schedule, e.g. 06:00 → 02:00
  return timeMinutes >= openMinutes || timeMinutes < closeMinutes
}

  useEffect(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    setSelectedDate(year + '-' + month + '-' + day)
  }, [])

  useEffect(() => {
    async function loadCourts() {
      const result = await supabase
        .from('courts')
        .select('*')
        .eq('status', 'available')
        .order('name')

      if (result.error) {
        console.error(result.error)
        setLoading(false)
        return
      }

      setCourts(result.data || [])
      setLoading(false)
    }

    loadCourts()
  }, [])

  useEffect(() => {
    if (!selectedDate) {
      return
    }

    let active = true

    async function loadBookings() {
      const result = await supabase.rpc('get_booked_slots', {
        p_booking_date: selectedDate,
      })

      if (!active) return

      if (result.error) {
        console.error('BOOKED SLOTS ERROR:', result.error)
        return
      }

      const formattedBookings = (result.data || []).map(function (
        booking: {
          court_id: string
          start_time: string
          status?: string
        }
      ) {
        return {
          court_id: booking.court_id,
          start_time: booking.start_time,
          status: 'confirmed',
        }
      })

      setBookings(formattedBookings)
    }

    void loadBookings()
    const intervalId = window.setInterval(() => {
      void loadBookings()
    }, 10000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [selectedDate])
  

useEffect(() => {
  if (!selectedDate) {
    setOperatingHoursLoading(true)
    return
  }

  let cancelled = false

  async function loadOperatingHours() {
    setOperatingHoursLoading(true)
    setOperatingHours(null)

    const date = new Date(selectedDate + 'T00:00:00')
    const dayOfWeek = date.getDay()

    const result = await supabase
      .from('operating_hours')
      .select('open_time, close_time, is_open')
      .eq('day_of_week', dayOfWeek)
      .single()

    if (cancelled) return

    if (result.error) {
      console.error('OPERATING HOURS ERROR:', result.error)
      setOperatingHoursLoading(false)
      return
    }

    setOperatingHours(result.data)
    setOperatingHoursLoading(false)
  }

  loadOperatingHours()

  return () => {
    cancelled = true
  }
}, [selectedDate])


  function isBooked(courtId: string, time: string) {
    return bookings.some(function (booking) {
      return (
        booking.court_id === courtId &&
        booking.start_time.startsWith(time) &&
        ['pending', 'confirmed'].includes(booking.status)
      )
    })
  }

  function getPrice(time: string) {
    const hour = Number(time.split(':')[0])

    // ₱210/hour from 6:00 AM through 2:00 PM.
    // ₱260/hour from 3:00 PM through 1:00 AM.
    if (hour >= 15 || hour <= 1) {
      return 260
    }

    return 210
  }


function getEndTime(time: string) {
  const hour = Number(time.split(':')[0])
  const endHour = (hour + 1) % 24

  return String(endHour).padStart(2, '0') + ':00'
}



function selectSlot(courtId: string, time: string) {
  if (isBooked(courtId, time)) return

  console.log('CLICKED SLOT:', { courtId, time })

  setMessage('')
  setBookingReference('')

  setSelectedSlots((previousSlots) => {
    console.log('BEFORE UPDATE:', previousSlots)

    const alreadySelected = previousSlots.some(
      (slot) => slot.courtId === courtId && slot.time === time
    )

    const nextSlots = alreadySelected
      ? previousSlots.filter(
          (slot) => !(slot.courtId === courtId && slot.time === time)
        )
      : [...previousSlots, { courtId, time }]

    console.log('AFTER UPDATE:', nextSlots)

    return nextSlots
  })
}


  function getTotalPrice() {
    return selectedSlots.reduce(function (total, slot) {
      return total + getPrice(slot.time)
    }, 0)
  }

async function createBooking() {
  if (!selectedDate || selectedSlots.length === 0) {
    setMessage('Please select a date and at least one court/time slot.')
    return
  }

  if (!customerName.trim()) {
    setMessage('Please enter your name.')
    return
  }

  if (!customerEmail.trim()) {
    setMessage('Please enter your email.')
    return
  }

  if (!customerPhone.trim()) {
    setMessage('Please enter your phone number.')
    return
  }

  setSubmitting(true)
  setMessage('')
  setBookingReference('')


  try {
    const response = await fetch('/api/create-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        selectedDate,
        selectedSlots,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setMessage(result.error || 'Unable to create booking.')
      setSubmitting(false)
      return
    }

    if (!result.paymentUrl || !result.bookingReference) {
      setMessage('Booking was created, but the payment link is missing. Please contact staff.')
      setSubmitting(false)
      return
    }

    window.location.href = result.paymentUrl
    return
  } catch (error) {
    console.error('Booking submission failed:', error)
    setMessage(
      error instanceof Error
        ? error.message
        : 'Unable to create booking. Please try again.'
    )
    setSubmitting(false)
    return
  }

}

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F8F5] p-8 text-[#263F34]">
        <div className="mx-auto max-w-7xl rounded-2xl border border-[#E5EAE3] bg-white p-8 shadow-sm">
          <p className="font-semibold">Loading Drink Point courts...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7F8F5] text-[#263F34]">
      <header className="sticky top-0 z-30 border-b border-[#E5EAE3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <a href="/" aria-label="Drink Point home" className="shrink-0">
            <img
              src="/images/drink-point-logo.png"
              alt="Drink Point"
              className="h-12 w-auto max-w-[150px] object-contain sm:h-14"
            />
          </a>
          <a
            href="/"
            className="hidden text-sm font-semibold text-[#53635A] transition hover:text-[#9676A5] sm:inline"
          >
            ← Back to home
          </a>
          <a
            href="/book"
            className="rounded-xl bg-[#D6E3A6] px-4 py-3 text-sm font-extrabold text-[#263F34] transition hover:bg-[#C5D98B]"
          >
            Booking
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8 overflow-hidden rounded-3xl bg-[#263F34] px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D6E3A6]">
            Drink Point Pickleball
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Book your next game
          </h1>
          <p className="mt-3 max-w-2xl leading-6 text-[#E1E8E2]">
            Choose your date, then select any available hours across Courts 1–6.
            You can combine different courts and times in one booking.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-[#E5EAE3] bg-white p-6 shadow-sm">
          <label className="mb-2 block font-bold text-[#263F34]">
            Select Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={function (event) {
              setSelectedDate(event.target.value)
              setSelectedSlots([])
              setMessage('')
              setBookingReference('')
            }}
            className="rounded-xl border border-[#DCE3DC] bg-white px-4 py-3 text-[#263F34] outline-none transition focus:border-[#9676A5] focus:ring-2 focus:ring-[#9676A5]/20"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E5EAE3] bg-white shadow-sm">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b bg-[#F2F4EF]">
                <th className="p-4 text-left">
                  Time
                </th>

                {courts.map(function (court) {
                  return (
                    <th
                      key={court.id}
                      className="p-4 text-center"
                    >
                      {court.name}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
 {timeSlots

.filter(function (time) {
  if (operatingHoursLoading || !operatingHours) {
    return false
  }

    if (!operatingHours.is_open) {
      return false
    }

    return isTimeWithinOperatingHours(
      time,
      operatingHours.open_time,
      operatingHours.close_time
    )
  })
  .map(function (time) {
    const endTime = getEndTime(time)

    return (
      <tr
        key={time}
        className="border-b border-[#E8EDE8] last:border-b-0"
      >
        <td className="whitespace-nowrap bg-[#FAFBF8] p-4 font-bold text-[#263F34]">
          {formatTime(time)}–{formatTime(endTime)}
        </td>

        {courts.map(function (court) {
          const booked = isBooked(court.id, time)

          const selected = selectedSlots.some(
            (slot) => slot.courtId === court.id && slot.time === time
          )

          const price = getPrice(time)

          return (
            <td
              key={court.id}
              className="p-2 text-center"
            >
              <button
                type="button"
                disabled={booked}
                onClick={function () {
                  selectSlot(court.id, time)
                }}
                className={
                  booked
                    ? 'w-full cursor-not-allowed rounded-xl bg-[#E5EAE5] px-3 py-3 text-sm font-semibold text-[#66736C]'
                    : selected
                    ? 'w-full rounded-xl bg-[#9676A5] px-3 py-3 text-sm font-bold text-white transition hover:bg-[#79558C]'
                    : 'w-full rounded-xl bg-[#F1EAF5] px-3 py-3 text-sm font-bold text-[#79558C] transition hover:bg-[#E5D9EC]'
                }
              >
                {booked
                  ? 'Booked'
                  : selected
                  ? '✓ Selected'
                  : '₱' + price}
              </button>
            </td>
          )
        })}
      </tr>
    )
  })}
            </tbody>
          </table>
        </div>

        {selectedSlots.length > 0 && (
          <div className="mt-8 rounded-3xl border border-[#E5EAE3] bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-xl font-bold">
              Your Selection
            </h2>

            <div className="mt-4 rounded-2xl bg-[#F7F8F5] p-4 sm:p-5">

              <p>
                <strong>Date:</strong> {selectedDate}
              </p>

              <p>
                <strong>Courts:</strong> {Array.from(new Set(selectedSlots.map((slot) => courts.find((court) => court.id === slot.courtId)?.name || 'Court'))).join(', ')}
              </p>

              <div className="mt-3">
                <strong>Selected Hours:</strong>

                <div className="mt-2 space-y-2">
                  {selectedSlots.map(function (slot) {
                    const courtName = courts.find((court) => court.id === slot.courtId)?.name || 'Court'
                    return (
                      <div
                        key={slot.courtId + '-' + slot.time}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white p-3"
                      >

<span>
  {courtName} · {formatTime(slot.time)}–{formatTime(getEndTime(slot.time))}
</span>

                        <span className="shrink-0 font-semibold">₱{getPrice(slot.time)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <p>
                  <strong>Total Hours:</strong>{' '}
                  {selectedSlots.length}
                </p>

                <p className="mt-1 text-xl font-bold">
                  <strong>Total:</strong> ₱{getTotalPrice()}
                </p>
              </div>

            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">

              <div>
                <label className="mb-2 block font-medium">
                  Full Name
                </label>

                <input
                  type="text"
                  value={customerName}
                  onChange={function (event) {
                    setCustomerName(event.target.value)
                  }}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-[#DCE3DC] bg-white px-4 py-3 text-[#263F34] outline-none transition placeholder:text-[#9AA59E] focus:border-[#9676A5] focus:ring-2 focus:ring-[#9676A5]/20"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={customerEmail}
                  onChange={function (event) {
                    setCustomerEmail(event.target.value)
                  }}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#DCE3DC] bg-white px-4 py-3 text-[#263F34] outline-none transition placeholder:text-[#9AA59E] focus:border-[#9676A5] focus:ring-2 focus:ring-[#9676A5]/20"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">
                  Phone Number
                </label>

                <input
                  type="tel"
                  value={customerPhone}
                  onChange={function (event) {
                    setCustomerPhone(event.target.value)
                  }}
                  placeholder="09XXXXXXXXX"
                  className="w-full rounded-xl border border-[#DCE3DC] bg-white px-4 py-3 text-[#263F34] outline-none transition placeholder:text-[#9AA59E] focus:border-[#9676A5] focus:ring-2 focus:ring-[#9676A5]/20"
                />
              </div>

            </div>

            <button
              type="button"
              onClick={createBooking}
              disabled={submitting}
              className="mt-6 rounded-xl bg-[#9676A5] px-7 py-4 font-extrabold text-white shadow-sm transition hover:bg-[#79558C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Creating Booking...'
                : 'Confirm Booking'}
            </button>

            {message && (
              <div className="mt-4 rounded-xl border border-[#E5EAE3] bg-[#F0F2EC] p-4">
                {message}
              </div>
            )}

            {bookingReference && (
              <div className="mt-4 rounded-xl border border-[#D6E3A6] bg-[#EEF5D8] p-4">
                <p className="font-semibold text-[#263F34]">
                  Booking Reference
                </p>

                <p className="mt-1 text-lg font-bold text-[#263F34]">
                  {bookingReference}
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      <footer className="border-t border-[#E5EAE3] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-center text-xs text-[#66736C] sm:px-8 md:flex-row">
          <span>© {new Date().getFullYear()} Drink Point. All rights reserved.</span>
          <a href="/" className="font-semibold text-[#9676A5] transition hover:text-[#79558C]">
            Back to home →
          </a>
        </div>
      </footer>
    </main>
  )
}