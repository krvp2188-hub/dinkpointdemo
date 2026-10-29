import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { receiptListRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to view payment receipts.' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['staff', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'You are not authorized to view payment receipts.' },
        { status: 403 }
      )
    }

    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'local-development'

    const { success } = await receiptListRateLimit.limit(clientIp)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many receipt requests. Please wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const url = new URL(request.url)
    const bookingReference = url.searchParams.get('reference')?.trim()

    let query = supabaseAdmin
      .from('payment_receipts')
      .select('id, booking_reference, transaction_reference, submitted_at, status, staff_note, storage_path')
      .order('submitted_at', { ascending: false })
      .limit(100)

    if (bookingReference) {
      // Per-booking viewer: return retained receipts for this booking, regardless of review status.
      query = query.eq('booking_reference', bookingReference)
    } else {
      // Approval queue: only receipts still awaiting staff review.
      query = query.eq('status', 'pending')
    }

    const { data: receipts, error } = await query

    if (error) {
      console.error('Receipt records query failed:', error.message)
      return NextResponse.json(
        { error: 'Could not load receipt records.' },
        { status: 500 }
      )
    }

    const results = await Promise.all(
      (receipts ?? []).map(async receipt => {
        const { data: signedFile, error: signedError } = await supabaseAdmin.storage
          .from('payment-receipts')
          .createSignedUrl(receipt.storage_path, 60 * 60)

        if (signedError) {
          console.error('Receipt signed URL generation failed:', {
            receiptId: receipt.id,
            message: signedError.message,
          })
        }

        return {
          id: receipt.id,
          bookingReference: receipt.booking_reference,
          transactionReference: receipt.transaction_reference,
          submittedAt: receipt.submitted_at,
          status: receipt.status,
          staffNote: receipt.staff_note ?? null,
          imageUrl: signedError ? null : signedFile?.signedUrl ?? null,
        }
      })
    )

    return NextResponse.json(
      { receipts: results },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error(
      'Pending receipts API failed:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Unable to load payment receipts.' },
      { status: 500 }
    )
  }
}
