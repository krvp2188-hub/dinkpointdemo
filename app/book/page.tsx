'use client'

import { useEffect, useRef, useState } from 'react'
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

type SlotOverride = {
  court_id: string
  booking_date: string
  start_time: string
  status: 'pending' | 'booked'
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

function getManilaDateTime() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''

  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const getTimePart = (type: string) =>
    timeParts.find((part) => part.type === type)?.value ?? '00'

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getTimePart('hour')}:${getTimePart('minute')}`,
  }
}

export default function BookingPage() {
  const router = useRouter()

  const [courts, setCourts] = useState<Court[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slotOverrides, setSlotOverrides] = useState<SlotOverride[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminSaving, setAdminSaving] = useState<string | null>(null)
  const [adminMessage, setAdminMessage] = useState('')

  const [selectedDate, setSelectedDate] = useState('')
  const moreDateInputRef = useRef<HTMLInputElement>(null)
  const [currentDateTime, setCurrentDateTime] = useState({ date: '', time: '' })
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
    const updateManilaDateTime = () => {
      const manilaNow = getManilaDateTime()
      setCurrentDateTime(manilaNow)
      setSelectedDate((current) => current || manilaNow.date)
    }

    updateManilaDateTime()
    const intervalId = window.setInterval(updateManilaDateTime, 30_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/admin/court-availability', { cache: 'no-store' })
      .then(async (response) => {
        if (!active) return
        if (response.ok) {
          const result = await response.json()
          setIsAdmin(Boolean(result.isAdmin))
        }
      })
      .catch(() => {
        if (active) setIsAdmin(false)
      })
    return () => { active = false }
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
      const result = await supabase.rpc('get_booked_slots_with_status', {
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
          status: booking.status || 'confirmed',
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
  if (!selectedDate) return

  let active = true
  async function loadSlotOverrides() {
    try {
      const response = await fetch(
        `/api/court-availability?date=${encodeURIComponent(selectedDate)}`,
        { cache: 'no-store' }
      )
      const result = await response.json()
      if (active && response.ok) {
        setSlotOverrides(Array.isArray(result.overrides) ? result.overrides : [])
      }
    } catch (error) {
      console.error('Could not load court availability overrides:', error)
    }
  }

  void loadSlotOverrides()
  const intervalId = window.setInterval(() => void loadSlotOverrides(), 10000)
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


  function getSlotOverride(courtId: string, time: string) {
    return slotOverrides.find(
      (override) => override.court_id === courtId &&
        override.booking_date === selectedDate &&
        override.start_time.startsWith(time)
    )
  }

  function isBooked(courtId: string, time: string) {
    const override = getSlotOverride(courtId, time)
    if (override && ['pending', 'booked'].includes(override.status)) return true

    return bookings.some(function (booking) {
      return (
        booking.court_id === courtId &&
        booking.start_time.startsWith(time) &&
        ['pending', 'confirmed', 'completed'].includes(booking.status)
      )
    })
  }

  async function setAdminSlotStatus(courtId: string, time: string, status: 'available' | 'pending' | 'booked') {
    const key = `${courtId}-${selectedDate}-${time}`
    setAdminSaving(key)
    setAdminMessage('')
    try {
      const response = await fetch('/api/admin/court-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, date: selectedDate, time, status }),
      })
      const result = await response.json()
      if (!response.ok) {
        setAdminMessage(result.error || 'Could not update court availability.')
        return
      }

      const refresh = await fetch(
        `/api/court-availability?date=${encodeURIComponent(selectedDate)}`,
        { cache: 'no-store' }
      )
      const refreshResult = await refresh.json()
      if (refresh.ok) setSlotOverrides(Array.isArray(refreshResult.overrides) ? refreshResult.overrides : [])
      setSelectedSlots((current) => current.filter((slot) => !(slot.courtId === courtId && slot.time === time)))
      setAdminMessage(`${courts.find((court) => court.id === courtId)?.name ?? 'Court'} at ${formatTime(time)} set to ${status}.`)
    } catch (error) {
      console.error(error)
      setAdminMessage('Network error while updating court availability.')
    } finally {
      setAdminSaving(null)
    }
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
          <p className="font-semibold">Loading Dink Point  courts...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7F8F5] text-[#263F34]">
      <header className="sticky top-0 z-30 border-b border-[#E5EAE3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <a href="/" aria-label="Dink Point  home" className="shrink-0">
            <img
              src="/images/drink-point-logo.png"
              alt="Dink Point "
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
            Dink Point  Pickleball
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Book your next game
          </h1>
          <p className="mt-3 max-w-2xl leading-6 text-[#E1E8E2]">
            Choose your date, then select any available hours across Courts 1–6.
            You can combine different courts and times in one booking.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-[#E5EAE3] bg-white p-3 shadow-[0_5px_18px_rgba(75,35,48,0.06)] sm:p-4">
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 13 }, (_, index) => {
              const baseDate = currentDateTime.date || selectedDate
              const date = new Date(`${baseDate}T12:00:00`)
              date.setDate(date.getDate() + index)

              const dateValue = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0'),
              ].join('-')
              const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
              const day = date.getDate()
              const month = date.toLocaleDateString('en-US', { month: 'short' })
              const isToday = dateValue === (currentDateTime.date || selectedDate)
              const isSelected = dateValue === selectedDate

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => {
                    setSelectedDate(dateValue)
                    setSelectedSlots([])
                    setMessage('')
                    setBookingReference('')
                  }}
                  aria-pressed={isSelected}
                  className={`flex min-w-[66px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center transition sm:min-w-[77px] ${
                    isSelected
                      ? 'border-[#263F34] bg-[#263F34] text-white shadow-sm'
                      : 'border-[#E5EAE3] bg-white text-[#263F34] hover:border-[#D6E3A6] hover:bg-[#F7F8F5]'
                  }`}
                >
                  <span className={`text-[10px] font-extrabold tracking-[0.12em] ${isSelected ? 'text-white/90' : 'text-[#53635A]'}`}>
                    {isToday ? 'TODAY' : weekday}
                  </span>
                  <span className="mt-1 text-2xl font-black leading-none">{day}</span>
                  <span className={`mt-1 text-[11px] font-medium ${isSelected ? 'text-white/90' : 'text-[#53635A]'}`}>
                    {month}
                  </span>
                </button>
              )
            })}

            <div className="relative flex min-w-[77px] shrink-0">
              <button
                type="button"
                onClick={() => {
                  const picker = moreDateInputRef.current
                  if (!picker) return

                  try {
                    if (typeof picker.showPicker === 'function') {
                      picker.showPicker()
                    } else {
                      picker.focus()
                      picker.click()
                    }
                  } catch {
                    picker.focus()
                    picker.click()
                  }
                }}
                className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#9676A5] bg-white px-3 py-3 text-center text-[#263F34] transition hover:bg-[#F1EAF5]"
                aria-label="Open calendar to choose another date"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-2 h-5 w-5">
                  <rect x="3.5" y="5" width="17" height="15" rx="2" />
                  <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
                </svg>
                <span className="text-xs font-bold">More</span>
              </button>
              <input
                ref={moreDateInputRef}
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  if (!event.target.value) return
                  setSelectedDate(event.target.value)
                  setSelectedSlots([])
                  setMessage('')
                  setBookingReference('')
                }}
                min={currentDateTime.date || undefined}
                aria-label="Choose another booking date"
                tabIndex={-1}
                className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
              />
            </div>
          </div>
        </div>

        {isAdmin && (
          <section className="mb-6 rounded-2xl border border-[#D6E3A6] bg-[#EEF5D8] p-5">
            <h2 className="text-lg font-extrabold text-[#263F34]">Admin court availability</h2>
            <p className="mt-1 text-sm text-[#53635A]">
              Choose a date above, then use the buttons in each court/time cell to set it Available, Pending, or Booked.
              Existing customer bookings are protected and cannot be overwritten here.
            </p>
            {adminMessage && <p role="status" className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold">{adminMessage}</p>}
          </section>
        )}

        <div className="overflow-x-auto rounded-2xl border border-[#E5EAE3] bg-white shadow-sm">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b bg-[#F2F4EF]">
                <th className="w-[110px] min-w-[110px] max-w-[110px] p-3 text-left">
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

    const withinOperatingHours = isTimeWithinOperatingHours(
      time,
      operatingHours.open_time,
      operatingHours.close_time
    )

    if (!withinOperatingHours) {
      return false
    }

    // Keep the full schedule visible to staff. For players, hide today's
    // slots that have already started, using the Asia/Manila clock.
    if (isAdmin || selectedDate !== currentDateTime.date || !currentDateTime.time) {
      return true
    }

    const slotMinutes =
      Number(time.split(':')[0]) * 60 +
      Number(time.split(':')[1])
    const nowMinutes =
      Number(currentDateTime.time.split(':')[0]) * 60 +
      Number(currentDateTime.time.split(':')[1])
    const openMinutes =
      Number(operatingHours.open_time.split(':')[0]) * 60 +
      Number(operatingHours.open_time.split(':')[1])
    const closeMinutes =
      Number(operatingHours.close_time.split(':')[0]) * 60 +
      Number(operatingHours.close_time.split(':')[1])
    const isOvernight = openMinutes >= closeMinutes

    // In an overnight schedule, slots after midnight belong after the
    // evening slots (e.g. 12 AM and 1 AM follow 11 PM).
    const adjustedSlotMinutes =
      isOvernight && slotMinutes < closeMinutes
        ? slotMinutes + 24 * 60
        : slotMinutes
    const currentHourMinutes = Math.floor(nowMinutes / 60) * 60
    const adjustedNowMinutes =
      isOvernight && currentHourMinutes < closeMinutes
        ? currentHourMinutes + 24 * 60
        : currentHourMinutes

    // Keep the current hourly slot visible until the next hour begins.
    return adjustedSlotMinutes >= adjustedNowMinutes
  })
  .map(function (time) {
    const endTime = getEndTime(time)

    return (
      <tr
        key={time}
        className="border-b border-[#E8EDE8] last:border-b-0"
      >
        <td className="w-[110px] min-w-[110px] max-w-[110px] whitespace-nowrap border-r border-[#E5EAE3] bg-[#F7F8F5] px-3 py-2 text-left align-middle">
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm font-extrabold text-[#263F34] sm:text-base">
              {formatTime(time)}
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-[#53635A]">
              to {formatTime(endTime)}
            </span>
          </div>
        </td>

        {courts.map(function (court) {
          const booked = isBooked(court.id, time)
          const override = getSlotOverride(court.id, time)
          const selected = selectedSlots.some(
            (slot) => slot.courtId === court.id && slot.time === time
          )
          const price = getPrice(time)
          const actualBooking = bookings.some((booking) =>
            booking.court_id === court.id &&
            booking.start_time.startsWith(time) &&
            ['pending', 'confirmed', 'completed'].includes(booking.status)
          )
          const actualBookingStatus = bookings.find((booking) =>
            booking.court_id === court.id &&
            booking.start_time.startsWith(time) &&
            ['pending', 'confirmed', 'completed'].includes(booking.status)
          )?.status
          const statusLabel = actualBookingStatus === 'pending'
            ? 'Pending'
            : actualBooking
              ? 'Booked'
              : override?.status === 'pending'
                ? 'Pending'
                : override?.status === 'booked'
                  ? 'Booked'
                  : '₱' + price

          return (
            <td key={court.id} className="p-2 text-center">
              {isAdmin ? (
                <div className="min-w-[130px] space-y-1">
                  <div className={`rounded-lg px-2 py-2 text-xs font-bold ${
                    actualBooking ? 'bg-red-100 text-red-800'
                    : override?.status === 'pending' ? 'bg-amber-100 text-amber-800'
                    : override?.status === 'booked' ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                  }`}>
                    {actualBooking ? 'Existing booking' : override?.status ?? 'Available'}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['available', 'pending', 'booked'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={adminSaving === `${court.id}-${selectedDate}-${time}` || (actualBooking && status !== 'available')}
                        onClick={() => void setAdminSlotStatus(court.id, time, status)}
                        className={`rounded-md px-1 py-2 text-[10px] font-bold capitalize disabled:cursor-not-allowed disabled:opacity-40 ${
                          status === 'available' ? 'bg-green-100 text-green-800'
                          : status === 'pending' ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {adminSaving === `${court.id}-${selectedDate}-${time}` ? 'Saving…' : status}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={booked}
                  onClick={() => selectSlot(court.id, time)}
                  className={
                    booked && statusLabel === 'Pending'
                      ? 'w-full cursor-not-allowed rounded-xl bg-green-100 px-3 py-2 text-sm font-semibold text-green-800 border border-green-300'
                      : booked
                      ? 'w-full cursor-not-allowed rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-800 border border-red-300'
                      : selected
                      ? 'w-full rounded-xl bg-[#9676A5] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#79558C]'
                      : 'w-full rounded-xl bg-[#F1EAF5] px-3 py-2 text-sm font-bold text-[#79558C] transition hover:bg-[#E5D9EC]'
                  }
                >
                  {booked ? statusLabel : selected ? '✓ Selected' : statusLabel}
                </button>
              )}
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
          <span>© {new Date().getFullYear()} Dink Point . All rights reserved.</span>
          <a href="/" className="font-semibold text-[#9676A5] transition hover:text-[#79558C]">
            Back to home →
          </a>
        </div>
      </footer>
    </main>
  )
}