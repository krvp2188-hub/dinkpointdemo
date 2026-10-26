
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { paymentRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function GET(request: Request) {
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
        { error: 'Too many receipt requests. Please wait a minute and try again.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      )
    }

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

    if (
      profileError ||
      !profile ||
      !['staff', 'admin'].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: 'You are not authorized to view payment receipts.' },
        { status: 403 }
      )
    }

    const { data: receipts, error } = await supabase
      .from('payment_receipts')
      .select(
        'id, booking_reference, transaction_reference, submitted_at, status, staff_note, storage_path'
      )
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Pending receipt query failed:', error.message)

      return NextResponse.json(
        { error: 'Could not load pending receipts.' },
        { status: 500 }
      )
    }

    const results = await Promise.all(
      (receipts || []).map(async receipt => {
        const { data: signedFile, error: signedError } =
          await supabaseAdmin.storage
            .from('payment-receipts')
            .createSignedUrl(receipt.storage_path, 60 * 5)

        if (signedError) {
          console.error('Receipt URL generation failed:', signedError.message)
        }

        return {
          id: receipt.id,
          bookingReference: receipt.booking_reference,
          transactionReference: receipt.transaction_reference,
          submittedAt: receipt.submitted_at,
          status: receipt.status,
          staffNote: receipt.staff_note,
          imageUrl: signedError ? null : signedFile.signedUrl,
        }
      })
    )

    return NextResponse.json({ receipts: results })
  } catch {
    return NextResponse.json(
      { error: 'Unable to load payment receipts.' },
      { status: 500 }
    )
  }
}
