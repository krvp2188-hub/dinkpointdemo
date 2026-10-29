import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date') || ''
  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 })
  }

  // Use UTC to derive the weekday from the date string, avoiding server timezone shifts.
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay()

  // Latest-created matching override wins if date ranges overlap.
  const overrideResult = await supabaseAdmin
    .from('operating_hours_overrides')
    .select('id, start_date, end_date, open_time, close_time, is_open, note, created_at')
    .lte('start_date', date)
    .gte('end_date', date)
    .order('created_at', { ascending: false })
    .limit(1)

  if (overrideResult.error) {
    // Preserve the existing weekly schedule if the override table has not been created yet.
    console.error('Date-specific operating hours query failed:', overrideResult.error.message)
  } else if (overrideResult.data && overrideResult.data.length > 0) {
    const override = overrideResult.data[0]
    return NextResponse.json({
      operatingHours: {
        open_time: override.open_time,
        close_time: override.close_time,
        is_open: override.is_open,
      },
      source: 'date-specific',
      note: override.note,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }

  const weeklyResult = await supabaseAdmin
    .from('operating_hours')
    .select('open_time, close_time, is_open')
    .eq('day_of_week', dayOfWeek)
    .maybeSingle()

  if (weeklyResult.error || !weeklyResult.data) {
    console.error('Weekly operating hours query failed:', weeklyResult.error?.message || 'No matching weekday')
    return NextResponse.json({ error: 'Could not load operating hours for this date.' }, { status: 500 })
  }

  return NextResponse.json({
    operatingHours: weeklyResult.data,
    source: 'weekly',
    note: null,
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
