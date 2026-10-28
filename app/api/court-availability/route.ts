import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('court_slot_overrides')
    .select('court_id, booking_date, start_time, status')
    .eq('booking_date', date)

  if (error) {
    console.error('Court slot overrides query failed:', error.message)
    return NextResponse.json({ error: 'Could not load court availability.' }, { status: 500 })
  }

  return NextResponse.json({ overrides: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
