
import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { paymentRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

function safeEqualHex(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) {
    return false
  }

  return timingSafeEqual(
    Buffer.from(a, 'hex'),
    Buffer.from(b, 'hex')
  )
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

    const { success } = await paymentRateLimit.limit(clientIp)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many payment requests. Please wait a minute and try again.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      )
    }

    const body: unknown = await request.json()

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid payment request.' },
        { status: 400 }
      )
    }

    const input = body as Record<string, unknown>
    const reference =
      typeof input.reference === 'string' ? input.reference.trim() : ''
    const token =
      typeof input.token === 'string' ? input.token : ''

    if (
      !/^PB-[A-Za-z0-9-]{8,80}$/.test(reference) ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired payment link.' },
        { status: 401 }
      )
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex')

    const { data: authorization, error: authError } =
      await supabaseAdmin
        .from('guest_payment_authorizations')
        .select('booking_reference, token_hash, expires_at, revoked_at')
        .eq('booking_reference', reference)
        .maybeSingle()

    if (authError || !authorization) {
      return NextResponse.json(
        { error: 'Invalid or expired payment link.' },
        { status: 401 }
      )
    }

    if (
      authorization.revoked_at ||
      new Date(authorization.expires_at).getTime() <= Date.now() ||
      !safeEqualHex(authorization.token_hash, tokenHash)
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired payment link.' },
        { status: 401 }
      )
    }

    const { data: bookings, error: bookingError } =
      await supabaseAdmin
        .from('bookings')
        .select('amount, status, payment_status, booking_date, start_time')
        .eq('booking_reference', reference)

    if (bookingError || !bookings || bookings.length === 0) {
      return NextResponse.json(
        { error: 'Booking details could not be found.' },
        { status: 404 }
      )
    }

    const totalAmount = bookings.reduce((sum, booking) => {
      const amount = Number(booking.amount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)

    const allPaid = bookings.every(
      booking => booking.payment_status === 'paid'
    )
    const allCancelled = bookings.every(
      booking => booking.status === 'cancelled'
    )

    return NextResponse.json({
      bookingReference: reference,
      totalAmount,
      bookingDate: bookings[0].booking_date,
      slots: bookings.map(booking => ({
        startTime: booking.start_time,
        status: booking.status,
      })),
      paymentStatus: allPaid
        ? 'paid'
        : allCancelled
          ? 'cancelled'
          : 'unpaid',
    })
  } catch {
    return NextResponse.json(
      { error: 'Unable to verify this payment link.' },
      { status: 400 }
    )
  }
}
