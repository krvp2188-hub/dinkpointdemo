
import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { bookingRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const allowedTimes = new Set([
  '06:00', '07:00', '08:00', '09:00', '10:00',
  '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00',
  '21:00', '22:00', '23:00', '00:00', '01:00',
])

function isString(value: unknown): value is string {
  return typeof value === 'string'
}


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTime(value: string): string {
  const [hourPart, minutePart = '00'] = value.split(':')
  const hour = Number(hourPart)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return value
  return `${hour % 12 || 12}:${minutePart} ${hour >= 12 ? 'PM' : 'AM'}`
}

function formatBookingDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date)
}

function peso(value: number): string {
  return `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
}

async function sendBookingConfirmationEmail(args: {
  to: string
  customerName: string
  bookingReference: string
  bookingDate: string
  slots: { courtName: string; startTime: string; endTime: string; amount: number; paymentStatus: string }[]
  totalAmount: number
  amountPaid: number
  paymentUrl: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    console.error('Booking email skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.')
    return false
  }

  const rows = args.slots.map((slot) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(slot.courtName)}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(formatTime(slot.startTime))} – ${escapeHtml(formatTime(slot.endTime))}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">${escapeHtml(peso(slot.amount))}</td>
    </tr>`).join('')
  const paymentStatus = args.amountPaid >= args.totalAmount && args.totalAmount > 0
    ? 'Paid'
    : args.amountPaid > 0
      ? 'Partially paid'
      : 'Unpaid — payment has not yet been confirmed'
  const textSlots = args.slots.map((slot) =>
    `• ${slot.courtName}: ${formatTime(slot.startTime)} – ${formatTime(slot.endTime)} (${peso(slot.amount)})`
  ).join('\n')

  const html = `<!doctype html><html><body style="margin:0;background:#f7f8f5;font-family:Arial,Helvetica,sans-serif;color:#263f34">
    <div style="max-width:640px;margin:24px auto;background:#ffffff;border:1px solid #e5eae3;border-radius:16px;overflow:hidden">
      <div style="background:#263f34;padding:28px 32px;color:#ffffff"><p style="margin:0;color:#d6e3a6;font-size:12px;font-weight:bold;letter-spacing:2px">DINK POINT PICKLEBALL</p><h1 style="margin:12px 0 0;font-size:26px">Booking confirmation</h1></div>
      <div style="padding:28px 32px"><p>Hi ${escapeHtml(args.customerName)},</p><p>Thanks for booking with Dink Point Pickleball. Please keep this email for your records.</p>
        <div style="background:#f2f4ef;border-radius:12px;padding:16px 18px;margin:20px 0"><p style="margin:0 0 6px;color:#53635a;font-size:12px;font-weight:bold;text-transform:uppercase">Booking reference</p><p style="margin:0;font-size:22px;font-weight:bold;letter-spacing:1px">${escapeHtml(args.bookingReference)}</p></div>
        <p><strong>Booking date:</strong> ${escapeHtml(formatBookingDate(args.bookingDate))}</p>
        <h2 style="font-size:17px;margin:24px 0 10px">Court and time details</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f7f8f5;text-align:left"><th style="padding:12px">Court</th><th style="padding:12px">Time</th><th style="padding:12px;text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
        <div style="margin:20px 0;padding:16px;border:1px solid #e5eae3;border-radius:12px"><p style="margin:0 0 8px"><strong>Total booking amount:</strong> ${escapeHtml(peso(args.totalAmount))}</p><p style="margin:0 0 8px"><strong>Amount paid:</strong> ${escapeHtml(peso(args.amountPaid))}</p><p style="margin:0"><strong>Payment status:</strong> ${escapeHtml(paymentStatus)}</p></div>
        <p style="margin:24px 0"><a href="${escapeHtml(args.paymentUrl)}" style="display:inline-block;background:#d6e3a6;color:#263f34;text-decoration:none;font-weight:bold;padding:13px 18px;border-radius:10px">View booking / payment details</a></p>
        <h2 style="font-size:17px;margin:24px 0 8px">Before you play</h2><ul style="padding-left:20px;line-height:1.7"><li>Please arrive a few minutes before your booked time.</li><li>Keep your booking reference ready in case staff needs to verify your reservation.</li></ul>
        <h2 style="font-size:17px;margin:24px 0 8px">Need to cancel or reschedule?</h2><p style="line-height:1.6">Please contact the Dink Point Pickleball team before your scheduled session and provide your booking reference <strong>${escapeHtml(args.bookingReference)}</strong>. Rescheduling depends on court availability, and any cancellation or refund is subject to the venue's applicable policy. Please do not assume a booking is cancelled until the team confirms it.</p>
        <p style="margin-top:28px;line-height:1.6">Thank you,<br><strong>Dink Point Pickleball</strong></p>
      </div></div></body></html>`

  const textBody = `DINK POINT PICKLEBALL — BOOKING CONFIRMATION\n\nHi ${args.customerName},\n\nBooking reference: ${args.bookingReference}\nBooking date: ${formatBookingDate(args.bookingDate)}\n\nCOURTS AND TIMES\n${textSlots}\n\nTotal booking amount: ${peso(args.totalAmount)}\nAmount paid: ${peso(args.amountPaid)}\nPayment status: ${paymentStatus}\n\nView booking / payment details: ${args.paymentUrl}\n\nBefore you play: Please arrive a few minutes early and keep your booking reference ready.\n\nTo cancel or reschedule, contact the Dink Point Pickleball team before your session and provide your booking reference. Rescheduling depends on availability; cancellation/refund is subject to the venue's applicable policy. Do not assume the booking is cancelled until the team confirms it.\n\nThank you,\nDink Point Pickleball`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [args.to], subject: `Dink Point Pickleball booking confirmation — ${args.bookingReference}`, html, text: textBody }),
  })
  if (!response.ok) {
    console.error('Booking confirmation email failed:', response.status, await response.text())
    return false
  }
  return true
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim()

    if (!clientIp) {
      return NextResponse.json(
        { error: 'Unable to verify request source. Please try again.' },
        { status: 400 }
      )
    }

    const { success } = await bookingRateLimit.limit(clientIp)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many booking attempts. Please wait a minute and try again.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      )
    }	
    const siteUrl = process.env.SITE_URL

    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL is not configured.' },
        { status: 500 }
      )
    }

    const requestOrigin = request.headers.get('origin')

    if (requestOrigin !== new URL(siteUrl).origin) {
      return NextResponse.json(
        { error: 'Request origin is not allowed.' },
        { status: 403 }
      )
    }	
    const body: unknown = await request.json()

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid booking request.' },
        { status: 400 }
      )
    }

    const input = body as Record<string, unknown>
    const customerName = isString(input.customerName)
      ? input.customerName.trim()
      : ''
    const customerEmail = isString(input.customerEmail)
      ? input.customerEmail.trim().toLowerCase()
      : ''
    const customerPhone = isString(input.customerPhone)
      ? input.customerPhone.trim()
      : ''
    const bookingDate = isString(input.selectedDate)
      ? input.selectedDate
      : ''
    const selectedSlots = input.selectedSlots

    if (
      !customerName ||
      customerName.length > 120 ||
      !customerEmail ||
      customerEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
      !customerPhone ||
      customerPhone.length > 40
    ) {
      return NextResponse.json(
        { error: 'Please provide valid name, email, and phone details.' },
        { status: 400 }
      )
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
      !Array.isArray(selectedSlots) ||
      selectedSlots.length < 1 ||
      selectedSlots.length > 120
    ) {
      return NextResponse.json(
        { error: 'Please select a valid booking date and time slots.' },
        { status: 400 }
      )
    }

    const courtIds: string[] = []
    const startTimes: string[] = []

    for (const slot of selectedSlots) {
      if (!slot || typeof slot !== 'object') {
        return NextResponse.json(
          { error: 'Invalid selected time slot.' },
          { status: 400 }
        )
      }

      const item = slot as Record<string, unknown>
      if (
        !isString(item.courtId) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.courtId) ||
        !isString(item.time) ||
        !allowedTimes.has(item.time)
      ) {
        return NextResponse.json(
          { error: 'Invalid selected court or time.' },
          { status: 400 }
        )
      }

      courtIds.push(item.courtId)
      startTimes.push(item.time)
    }

    const pairs = courtIds.map((id, index) => `${id}|${startTimes[index]}`)
    if (new Set(pairs).size !== pairs.length) {
      return NextResponse.json(
        { error: 'A court and time slot was selected more than once.' },
        { status: 400 }
      )
    }

    // Reject slots manually held/blocked by an admin for this date.
    const { data: blockedSlots, error: overridesError } = await supabaseAdmin
      .from('court_slot_overrides')
      .select('court_id, start_time, status')
      .eq('booking_date', bookingDate)
      .in('status', ['pending', 'booked'])
      .in('court_id', courtIds)

    if (overridesError) {
      console.error('Could not check admin court availability:', overridesError.message)
      return NextResponse.json(
        { error: 'We could not verify court availability. Please try again.' },
        { status: 500 }
      )
    }

    const blockedPairs = new Set(
      (blockedSlots ?? []).map((slot) => `${slot.court_id}|${String(slot.start_time).slice(0, 5)}`)
    )
    const blockedSelection = courtIds.some((courtId, index) =>
      blockedPairs.has(`${courtId}|${startTimes[index]}`)
    )

    if (blockedSelection) {
      return NextResponse.json(
        { error: 'One or more selected court/time slots are no longer available. Please refresh and select another slot.' },
        { status: 409 }
      )
    }

    const bookingReference =
      `PB-${Date.now()}-${randomBytes(8).toString('hex')}`
    const guestToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256')
      .update(guestToken)
      .digest('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { data, error } = await supabaseAdmin.rpc(
      'create_secure_guest_booking',
      {
        p_booking_reference: bookingReference,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_customer_phone: customerPhone,
        p_court_ids: courtIds,
        p_booking_date: bookingDate,
        p_start_times: startTimes,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
      }
    )

    if (error) {
      console.error('Secure booking creation failed:', error.message)
      return NextResponse.json(
        { error: 'We could not create this booking. Please refresh and try again.' },
        { status: 400 }
      )
    }

    const origin = process.env.SITE_URL?.replace(/\/+$/, '')
    if (!origin) {
      return NextResponse.json(
        { error: 'Site URL is not configured.' },
        { status: 500 }
      )
    }
    const paymentUrl =
      `${origin}/booking-payment?reference=${encodeURIComponent(bookingReference)}` +
      `#token=${encodeURIComponent(guestToken)}`

    const bookings = Array.isArray(data) ? data : []
    const rpcTotalAmount = bookings.reduce((sum, row) => {
      const amount = Number(row.amount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)

    // Fetch the persisted booking rows so the confirmation email uses actual
    // court names, slot times, amounts, and payment status from the database.
    const { data: savedBookings, error: savedBookingsError } = await supabaseAdmin
      .from('bookings')
      .select('booking_reference, booking_date, court_id, start_time, end_time, amount, status, payment_status')
      .eq('booking_reference', bookingReference)
      .order('start_time', { ascending: true })

    let totalAmount = rpcTotalAmount
    let amountPaid = 0
    let emailSlots: { courtName: string; startTime: string; endTime: string; amount: number; paymentStatus: string }[] = []

    if (savedBookingsError) {
      console.error('Could not load saved booking details for email:', savedBookingsError.message)
    } else if (savedBookings && savedBookings.length > 0) {
      const savedCourtIds = [...new Set(savedBookings.map((booking) => booking.court_id))]
      const { data: savedCourts, error: savedCourtsError } = await supabaseAdmin
        .from('courts')
        .select('id, name')
        .in('id', savedCourtIds)

      if (savedCourtsError) {
        console.error('Could not load court names for booking email:', savedCourtsError.message)
      }
      const courtNameById = new Map((savedCourts ?? []).map((court) => [court.id, court.name]))
      emailSlots = savedBookings.map((booking) => {
        const amount = Number(booking.amount)
        const safeAmount = Number.isFinite(amount) ? amount : 0
        const paymentStatus = String(booking.payment_status ?? 'unpaid').toLowerCase()
        if (paymentStatus === 'paid') amountPaid += safeAmount
        return {
          courtName: courtNameById.get(booking.court_id) ?? 'Court',
          startTime: String(booking.start_time).slice(0, 5),
          endTime: String(booking.end_time).slice(0, 5),
          amount: safeAmount,
          paymentStatus,
        }
      })
      totalAmount = emailSlots.reduce((sum, slot) => sum + slot.amount, 0)
    } else {
      // Fallback if the database read is briefly unavailable after the booking RPC.
      const { data: fallbackCourts } = await supabaseAdmin
        .from('courts')
        .select('id, name')
        .in('id', courtIds)
      const courtNameById = new Map((fallbackCourts ?? []).map((court) => [court.id, court.name]))
      emailSlots = selectedSlots.map((slot: { courtId: string; time: string }, index: number) => {
        const startHour = Number(slot.time.split(':')[0])
        const endHour = startHour === 23 ? 0 : startHour + 1
        const endTime = `${String(endHour).padStart(2, '0')}:00`
        const amount = Number(bookings[index]?.amount ?? 0)
        return {
          courtName: courtNameById.get(slot.courtId) ?? 'Court',
          startTime: slot.time,
          endTime,
          amount: Number.isFinite(amount) ? amount : 0,
          paymentStatus: 'unpaid',
        }
      })
      totalAmount = emailSlots.reduce((sum, slot) => sum + slot.amount, 0) || rpcTotalAmount
    }

    // Email failure must not undo a successful booking or prevent the payment page opening.
    let confirmationEmailSent = false
    try {
      confirmationEmailSent = await sendBookingConfirmationEmail({
        to: customerEmail,
        customerName,
        bookingReference,
        bookingDate,
        slots: emailSlots,
        totalAmount,
        amountPaid,
        paymentUrl,
      })
    } catch (emailError) {
      console.error('Unexpected booking confirmation email error:', emailError)
    }

    return NextResponse.json({
      bookingReference,
      paymentUrl,
      totalAmount,
      expiresAt,
      confirmationEmailSent,
    })
  } catch {
    return NextResponse.json(
      { error: 'Invalid booking request.' },
      { status: 400 }
    )
  }
}
