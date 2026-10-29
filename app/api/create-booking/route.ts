
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

const allowedOrigins = new Set(
  [
    siteUrl,
    'https://dinkpointdemo.vercel.app',
    'https://dinkpointpanabo.com',
    'https://www.dinkpointpanabo.com',
  ].map((origin) => new URL(origin).origin)
)

if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
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
        p_expires_at: null,
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
    const totalAmount = bookings.reduce((sum, row) => {
      const amount = Number(row.amount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)

    // Confirmation emails are intentionally NOT sent when a booking is created.
    // The email will be sent only after staff approves the customer's payment receipt.

    return NextResponse.json({
      bookingReference,
      paymentUrl,
      totalAmount,
    })
  } catch {
    return NextResponse.json(
      { error: 'Invalid booking request.' },
      { status: 400 }
    )
  }
}
