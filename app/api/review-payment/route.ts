import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentRateLimit } from '@/lib/rate-limit'
import { sendApprovedBookingConfirmationEmail } from '@/lib/email/booking-confirmation'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim()

    if (!clientIp) {
      return NextResponse.json({ error: 'Unable to verify request source. Please try again.' }, { status: 400 })
    }

    const { success } = await paymentRateLimit.limit(clientIp)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many payment review requests. Please wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const siteUrl = process.env.SITE_URL
    if (!siteUrl) return NextResponse.json({ error: 'Site URL is not configured.' }, { status: 500 })
    if (request.headers.get('origin') !== new URL(siteUrl).origin) {
      return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Please sign in to review payments.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profileError || !profile || !['staff', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'You are not authorized to review payments.' }, { status: 403 })
    }

    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid review request.' }, { status: 400 })
    }

    const input = body as Record<string, unknown>
    const receiptId = typeof input.receiptId === 'string' ? input.receiptId : ''
    const action = typeof input.action === 'string' ? input.action : ''
    const staffNote = typeof input.staffNote === 'string' ? input.staffNote.trim() : null

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receiptId) ||
      !['approve', 'reject'].includes(action) ||
      (staffNote !== null && staffNote.length > 500)
    ) {
      return NextResponse.json({ error: 'Please provide a valid receipt, action, and staff note.' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('review_payment_receipt', {
      p_receipt_id: receiptId,
      p_action: action,
      p_staff_note: staffNote,
    })

    if (error) {
      console.error('Receipt review failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    let emailStatus: string | null = null
    let confirmationEmailSent = false

    if (action === 'approve') {
      const result = data && typeof data === 'object' && !Array.isArray(data)
        ? data as Record<string, unknown>
        : {}
      const bookingReference = typeof result.booking_reference === 'string' ? result.booking_reference : ''

      if (bookingReference) {
        const emailResult = await sendApprovedBookingConfirmationEmail(bookingReference)
        emailStatus = emailResult.status
        confirmationEmailSent = emailResult.status === 'sent' || emailResult.status === 'already_sent'
        if (emailResult.error) console.error('Confirmation email status:', emailResult.error)
      } else {
        emailStatus = 'failed'
        console.error('Receipt approval response did not include a booking reference.')
      }
    }

    const responseData = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : { result: data }

    return NextResponse.json({ ...responseData, confirmationEmailSent, emailStatus })
  } catch (error) {
    console.error('Unable to process payment review:', error)
    return NextResponse.json({ error: 'Unable to process the review request.' }, { status: 500 })
  }
}
