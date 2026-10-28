import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || profile?.role !== 'admin') return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ isAdmin: false }, { status: 200 })
  return NextResponse.json({ isAdmin: true })
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const courtId = typeof input.courtId === 'string' ? input.courtId : ''
  const date = typeof input.date === 'string' ? input.date : ''
  const time = typeof input.time === 'string' ? input.time : ''
  const status = typeof input.status === 'string' ? input.status : ''

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courtId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^(?:[01]\d|2[0-3]):00$/.test(time) ||
    !['available', 'pending', 'booked'].includes(status)
  ) {
    return NextResponse.json({ error: 'Invalid court, date, time, or status.' }, { status: 400 })
  }

  const { data: court, error: courtError } = await supabaseAdmin
    .from('courts')
    .select('id')
    .eq('id', courtId)
    .maybeSingle()

  if (courtError || !court) {
    return NextResponse.json({ error: 'Court not found.' }, { status: 404 })
  }

  // Never overwrite a real booking by setting an override.
  const { data: existingBookings, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('id, status')
    .eq('court_id', courtId)
    .eq('booking_date', date)
    .eq('start_time', time)
    .in('status', ['pending', 'confirmed', 'completed'])

  if (bookingError) {
    console.error('Could not check existing bookings:', bookingError.message)
    return NextResponse.json({ error: 'Could not verify existing bookings.' }, { status: 500 })
  }

  if ((existingBookings?.length ?? 0) > 0) {
    return NextResponse.json({
      error: 'An existing booking already occupies this slot. Cancel or resolve that booking through the booking-management workflow first.',
    }, { status: 409 })
  }

  if (status === 'available') {
    const { error } = await supabaseAdmin
      .from('court_slot_overrides')
      .delete()
      .eq('court_id', courtId)
      .eq('booking_date', date)
      .eq('start_time', time)

    if (error) {
      console.error('Could not clear court slot override:', error.message)
      return NextResponse.json({ error: 'Could not make this slot available.' }, { status: 500 })
    }
  } else {
    const { error } = await supabaseAdmin
      .from('court_slot_overrides')
      .upsert({
        court_id: courtId,
        booking_date: date,
        start_time: time,
        status,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'court_id,booking_date,start_time' })

    if (error) {
      console.error('Could not save court slot override:', error.message)
      return NextResponse.json({ error: 'Could not update court availability.' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, status })
}
