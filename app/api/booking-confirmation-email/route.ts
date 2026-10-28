import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { paymentRateLimit } from '@/lib/rate-limit'
import { sendApprovedBookingConfirmationEmail } from '@/lib/email/booking-confirmation'

export const runtime = 'nodejs'

async function authorizedStaff() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      error: 'Please sign in to manage confirmation emails.',
    }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile || !['staff', 'admin'].includes(profile.role)) {
    return {
      ok: false as const,
      status: 403,
      error: 'You are not authorized to manage confirmation emails.',
    }
  }

  return { ok: true as const }
}

export async function GET() {
  try {
    const auth = await authorizedStaff()
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    // Return recent successful sends as well as failures needing attention.
    const { data, error } = await supabaseAdmin
      .from('booking_confirmation_emails')
      .select(
        'booking_reference, status, attempt_count, last_error, updated_at, sent_at'
      )
      .in('status', ['failed', 'sending', 'sent'])
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Could not load confirmation email queue:', error.message)
      return NextResponse.json(
        { error: 'Could not load confirmation email status.' },
        { status: 500 }
      )
    }

    const now = Date.now()
    const staleBefore = now - 10 * 60 * 1000
    const sentSince = now - 30 * 24 * 60 * 60 * 1000

    const visibleRecords = (data ?? []).filter((item) => {
      if (item.status === 'failed') return true
      if (
        item.status === 'sending' &&
        Date.parse(item.updated_at) < staleBefore
      ) {
        return true
      }
      if (
        item.status === 'sent' &&
        item.sent_at &&
        Date.parse(item.sent_at) >= sentSince
      ) {
        return true
      }
      return false
    })

    return NextResponse.json({ emails: visibleRecords })
  } catch (error) {
    console.error('Confirmation email queue error:', error)
    return NextResponse.json(
      { error: 'Could not load confirmation email status.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim()

    if (!clientIp) {
      return NextResponse.json(
        { error: 'Unable to verify request source.' },
        { status: 400 }
      )
    }

    const { success: rateLimitSuccess } =
      await paymentRateLimit.limit(clientIp)

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      )
    }

    const siteUrl = process.env.SITE_URL
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL is not configured.' },
        { status: 500 }
      )
    }

    if (request.headers.get('origin') !== new URL(siteUrl).origin) {
      return NextResponse.json(
        { error: 'Request origin is not allowed.' },
        { status: 403 }
      )
    }

    const auth = await authorizedStaff()
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid retry request.' },
        { status: 400 }
      )
    }

    const bookingReference = (body as Record<string, unknown>).bookingReference

    if (
      typeof bookingReference !== 'string' ||
      !bookingReference.trim() ||
      bookingReference.length > 120
    ) {
      return NextResponse.json(
        { error: 'A valid booking reference is required.' },
        { status: 400 }
      )
    }

    const result = await sendApprovedBookingConfirmationEmail(
      bookingReference.trim()
    )
    const success =
      result.status === 'sent' || result.status === 'already_sent'

    return NextResponse.json(
      {
        success,
        emailStatus: result.status,
        error: result.error ?? null,
      },
      {
        status:
          success ? 200 : result.status === 'not_ready' ? 409 : 500,
      }
    )
  } catch (error) {
    console.error('Confirmation email retry failed:', error)
    return NextResponse.json(
      { error: 'Unable to retry confirmation email.' },
      { status: 500 }
    )
  }
}
