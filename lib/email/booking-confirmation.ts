import { supabaseAdmin } from '@/lib/supabase/admin'

type BookingEmailSlot = {
  courtName: string
  startTime: string
  endTime: string
  amount: number
}

export type BookingEmailResult = {
  status: 'sent' | 'already_sent' | 'failed' | 'not_ready' | 'already_sending'
  error?: string
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
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date)
}

function peso(value: number): string {
  return `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
}

/** Sends a confirmation only after every slot in this booking reference is paid and confirmed. */
export async function sendApprovedBookingConfirmationEmail(
  bookingReference: string
): Promise<BookingEmailResult> {
  const now = new Date()
  const nowIso = now.toISOString()
  const staleBeforeIso = new Date(now.getTime() - 10 * 60 * 1000).toISOString()

  try {
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('booking_reference, booking_date, customer_name_at_booking, customer_email_at_booking, court_id, start_time, end_time, amount, status, payment_status')
      .eq('booking_reference', bookingReference)
      .order('start_time', { ascending: true })

    if (bookingsError) {
      console.error('Could not load booking for confirmation email:', bookingsError.message)
      return { status: 'failed', error: 'Could not load booking details.' }
    }

    if (!bookings || bookings.length === 0) {
      return { status: 'failed', error: 'No booking rows were found.' }
    }

    const allPaidAndConfirmed = bookings.every((booking) =>
      String(booking.payment_status ?? '').toLowerCase() === 'paid' &&
      String(booking.status ?? '').toLowerCase() === 'confirmed'
    )

    if (!allPaidAndConfirmed) {
      return { status: 'not_ready', error: 'Not every court slot is paid and confirmed.' }
    }

    const firstBooking = bookings[0]
    const customerEmail = String(firstBooking.customer_email_at_booking ?? '').trim()
    const customerName = String(firstBooking.customer_name_at_booking ?? '').trim()
    const bookingDate = String(firstBooking.booking_date ?? '')

    if (!customerEmail || !customerName || !bookingDate) {
      return { status: 'failed', error: 'Customer email, name, or booking date is missing.' }
    }

    const courtIds = [...new Set(bookings.map((booking) => booking.court_id))]
    const { data: courts, error: courtsError } = await supabaseAdmin
      .from('courts')
      .select('id, name')
      .in('id', courtIds)

    if (courtsError) {
      console.error('Could not load court names for confirmation email:', courtsError.message)
      return { status: 'failed', error: 'Could not load court names.' }
    }

    const courtNameById = new Map((courts ?? []).map((court) => [court.id, court.name]))
    const slots: BookingEmailSlot[] = bookings.map((booking) => ({
      courtName: courtNameById.get(booking.court_id) ?? 'Court',
      startTime: String(booking.start_time).slice(0, 5),
      endTime: String(booking.end_time).slice(0, 5),
      amount: Number(booking.amount),
    }))

    if (slots.some((slot) => !Number.isFinite(slot.amount))) {
      return { status: 'failed', error: 'A booking amount is invalid.' }
    }

    const totalAmount = slots.reduce((sum, slot) => sum + slot.amount, 0)

    // Create the tracking row once. Existing records are left unchanged.
    const { error: createTrackingError } = await supabaseAdmin
      .from('booking_confirmation_emails')
      .upsert(
        { booking_reference: bookingReference, status: 'pending', updated_at: nowIso },
        { onConflict: 'booking_reference', ignoreDuplicates: true }
      )

    if (createTrackingError) {
      console.error('Could not initialize confirmation email tracking:', createTrackingError.message)
      return { status: 'failed', error: 'Could not initialize email tracking.' }
    }

    let { data: tracking, error: trackingError } = await supabaseAdmin
      .from('booking_confirmation_emails')
      .select('status, updated_at, attempt_count')
      .eq('booking_reference', bookingReference)
      .maybeSingle()

    if (trackingError || !tracking) {
      console.error('Could not read confirmation email tracking:', trackingError?.message)
      return { status: 'failed', error: 'Could not read email tracking.' }
    }

    if (tracking.status === 'sent') return { status: 'already_sent' }

    if (tracking.status === 'sending') {
      const lastUpdated = Date.parse(String(tracking.updated_at ?? ''))
      if (Number.isFinite(lastUpdated) && lastUpdated > Date.parse(staleBeforeIso)) {
        return { status: 'already_sending' }
      }

      // Recover a send that was left stuck in "sending" for more than 10 minutes.
      await supabaseAdmin
        .from('booking_confirmation_emails')
        .update({ status: 'failed', updated_at: nowIso, last_error: 'Recovered stale sending attempt.' })
        .eq('booking_reference', bookingReference)
        .eq('status', 'sending')
        .lt('updated_at', staleBeforeIso)

      const refreshed = await supabaseAdmin
        .from('booking_confirmation_emails')
        .select('status, updated_at, attempt_count')
        .eq('booking_reference', bookingReference)
        .maybeSingle()
      tracking = refreshed.data
      trackingError = refreshed.error
      if (trackingError || !tracking) {
        return { status: 'failed', error: 'Could not refresh email tracking.' }
      }
      if (tracking.status === 'sent') return { status: 'already_sent' }
      if (tracking.status === 'sending') return { status: 'already_sending' }
    }

    // Atomic claim: only one concurrent request can change pending/failed to sending.
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('booking_confirmation_emails')
      .update({
        status: 'sending',
        attempt_count: Number(tracking.attempt_count ?? 0) + 1,
        updated_at: nowIso,
        last_error: null,
      })
      .eq('booking_reference', bookingReference)
      .in('status', ['pending', 'failed'])
      .select('booking_reference')
      .maybeSingle()

    if (claimError) {
      console.error('Could not claim confirmation email send:', claimError.message)
      return { status: 'failed', error: 'Could not start email delivery.' }
    }

    if (!claim) {
      const latest = await supabaseAdmin
        .from('booking_confirmation_emails')
        .select('status')
        .eq('booking_reference', bookingReference)
        .maybeSingle()
      return latest.data?.status === 'sent'
        ? { status: 'already_sent' }
        : { status: 'already_sending' }
    }

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM_EMAIL

    if (!apiKey || !from) {
      const reason = 'RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.'
      await supabaseAdmin.from('booking_confirmation_emails').update({
        status: 'failed', last_error: reason, updated_at: new Date().toISOString(),
      }).eq('booking_reference', bookingReference)
      return { status: 'failed', error: reason }
    }

    const rows = slots.map((slot) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(slot.courtName)}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(formatTime(slot.startTime))} – ${escapeHtml(formatTime(slot.endTime))}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">${escapeHtml(peso(slot.amount))}</td>
      </tr>`).join('')

    const textSlots = slots.map((slot) =>
      `- ${slot.courtName}: ${formatTime(slot.startTime)} – ${formatTime(slot.endTime)} (${peso(slot.amount)})`
    ).join('\n')

    const html = `<!doctype html><html><body style="margin:0;background:#f7f8f5;font-family:Arial,Helvetica,sans-serif;color:#263f34">
      <div style="max-width:640px;margin:24px auto;background:#ffffff;border:1px solid #e5eae3;border-radius:16px;overflow:hidden">
        <div style="background:#263f34;padding:28px 32px;color:#ffffff"><p style="margin:0;color:#d6e3a6;font-size:12px;font-weight:bold;letter-spacing:2px">DINK POINT PICKLEBALL</p><h1 style="margin:12px 0 0;font-size:26px">Booking confirmed!</h1></div>
        <div style="padding:28px 32px"><p>Hi ${escapeHtml(customerName)},</p><p>Your GCash payment has been approved, and all court slots in this booking are paid and confirmed. Please keep this email for your records.</p>
          <div style="background:#f2f4ef;border-radius:12px;padding:16px 18px;margin:20px 0"><p style="margin:0 0 6px;color:#53635a;font-size:12px;font-weight:bold;text-transform:uppercase">Booking reference</p><p style="margin:0;font-size:22px;font-weight:bold;letter-spacing:1px">${escapeHtml(bookingReference)}</p></div>
          <p><strong>Booking date:</strong> ${escapeHtml(formatBookingDate(bookingDate))}</p>
          <h2 style="font-size:17px;margin:24px 0 10px">Court and time details</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f7f8f5;text-align:left"><th style="padding:12px">Court</th><th style="padding:12px">Time</th><th style="padding:12px;text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
          <div style="margin:20px 0;padding:16px;border:1px solid #e5eae3;border-radius:12px"><p style="margin:0 0 8px"><strong>Total booking amount:</strong> ${escapeHtml(peso(totalAmount))}</p><p style="margin:0 0 8px"><strong>Amount paid:</strong> ${escapeHtml(peso(totalAmount))}</p><p style="margin:0 0 8px"><strong>Payment status:</strong> Paid</p><p style="margin:0"><strong>Booking status:</strong> Confirmed</p></div>
          <h2 style="font-size:17px;margin:24px 0 8px">Before you play</h2><ul style="padding-left:20px;line-height:1.7"><li>Please arrive a few minutes before your booked time.</li><li>Keep your booking reference ready so staff can verify your reservation.</li></ul>
          <h2 style="font-size:17px;margin:24px 0 8px">Need to cancel or reschedule?</h2><p style="line-height:1.6">Contact the Dink Point Pickleball team before your scheduled session and provide your booking reference. Rescheduling depends on court availability, and cancellations or refunds are subject to the venue's applicable policy.</p>
          <p style="margin-top:28px;line-height:1.6">Thank you,<br><strong>Dink Point Pickleball</strong></p>
        </div></div></body></html>`

    const textBody = `DINK POINT PICKLEBALL — BOOKING CONFIRMED\n\nHi ${customerName},\n\nYour GCash payment has been approved, and all court slots in this booking are paid and confirmed.\n\nBooking reference: ${bookingReference}\nBooking date: ${formatBookingDate(bookingDate)}\n\nCOURTS AND TIMES\n${textSlots}\n\nTotal booking amount: ${peso(totalAmount)}\nAmount paid: ${peso(totalAmount)}\nPayment status: Paid\nBooking status: Confirmed\n\nPlease arrive a few minutes early and keep your booking reference ready.\n\nTo cancel or reschedule, contact the Dink Point Pickleball team before your session. Rescheduling depends on availability, and cancellations or refunds are subject to the venue's applicable policy.\n\nThank you,\nDink Point Pickleball`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `booking-confirmation-${bookingReference}`,
      },
      body: JSON.stringify({
        from,
        to: [customerEmail],
        subject: `Dink Point Pickleball booking confirmed — ${bookingReference}`,
        html,
        text: textBody,
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      await supabaseAdmin.from('booking_confirmation_emails').update({
        status: 'failed',
        last_error: `Resend returned ${response.status}: ${responseText.slice(0, 1000)}`,
        updated_at: new Date().toISOString(),
      }).eq('booking_reference', bookingReference)
      console.error('Booking confirmation email failed:', response.status, responseText)
      return { status: 'failed', error: `Resend returned status ${response.status}.` }
    }

    const resendResult = await response.json().catch(() => ({})) as { id?: string }
    const { error: saveSentError } = await supabaseAdmin
      .from('booking_confirmation_emails')
      .update({
        status: 'sent',
        last_error: null,
        resend_email_id: resendResult.id ?? null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('booking_reference', bookingReference)

    if (saveSentError) {
      // Resend idempotency key protects retries from sending a duplicate immediately.
      console.error('Email sent, but delivery tracking could not be saved:', saveSentError.message)
      return { status: 'failed', error: 'Email may have been sent, but its status could not be saved.' }
    }

    return { status: 'sent' }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unexpected email error.'
    console.error('Booking confirmation email request failed:', error)
    await supabaseAdmin.from('booking_confirmation_emails').update({
      status: 'failed', last_error: reason.slice(0, 1000), updated_at: new Date().toISOString(),
    }).eq('booking_reference', bookingReference)
    return { status: 'failed', error: reason }
  }
}
