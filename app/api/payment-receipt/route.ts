
import { NextResponse } from 'next/server'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { paymentRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const allowedTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function validHash(hash: string) {
  return /^[a-f0-9]{64}$/.test(hash)
}

function hashesMatch(a: string, b: string) {
  if (!validHash(a) || !validHash(b)) return false

  return timingSafeEqual(
    Buffer.from(a, 'hex'),
    Buffer.from(b, 'hex')
  )
}

function matchesImageSignature(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    )
  }

  if (type === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  }

  if (type === 'image/webp') {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    )
  }

  return false
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
        { error: 'Too many receipt submissions. Please wait a minute and try again.' },
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

    if (requestOrigin !== new URL(siteUrl).origin) {
      return NextResponse.json(
        { error: 'Request origin is not allowed.' },
        { status: 403 }
      )
    }
    const formData = await request.formData()

    const bookingReference = String(
      formData.get('bookingReference') || ''
    ).trim()

    const token = String(formData.get('token') || '')

    const transactionReference = String(
      formData.get('transactionReference') || ''
    ).trim()

    const receipt = formData.get('receipt')

    if (
      !/^PB-[A-Za-z0-9-]{8,80}$/.test(bookingReference) ||
      !/^[a-f0-9]{64}$/.test(token) ||
      !transactionReference ||
      transactionReference.length < 4 ||
      transactionReference.length > 100 ||
      /[\r\n<>]/.test(transactionReference) ||
      !(receipt instanceof File)
    ) {
      return NextResponse.json(
        { error: 'Enter valid payment details and attach a receipt image.' },
        { status: 400 }
      )
    }

    const extension = allowedTypes[receipt.type]

    if (
      !extension ||
      receipt.size <= 0 ||
      receipt.size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: 'Upload a JPG, PNG, or WebP receipt up to 5 MB.' },
        { status: 400 }
      )
    }

    const bytes = new Uint8Array(await receipt.arrayBuffer())

    if (!matchesImageSignature(bytes, receipt.type)) {
      return NextResponse.json(
        { error: 'The uploaded file does not match an accepted image format.' },
        { status: 400 }
      )
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex')

    const { data: authorization, error: authError } =
      await supabaseAdmin
        .from('guest_payment_authorizations')
.select('booking_reference, token_hash, revoked_at')
        .eq('booking_reference', bookingReference)
        .maybeSingle()

if (
  authError ||
  !authorization ||
  authorization.revoked_at ||
  !hashesMatch(authorization.token_hash, tokenHash)
) {
      return NextResponse.json(
        { error: 'Invalid or expired payment link.' },
        { status: 401 }
      )
    }

    const { data: bookings, error: bookingError } =
      await supabaseAdmin
        .from('bookings')
        .select('status, payment_status')
        .eq('booking_reference', bookingReference)

    if (bookingError || !bookings?.length) {
      return NextResponse.json(
        { error: 'Could not validate this booking.' },
        { status: 404 }
      )
    }

    if (
      bookings.some(
        booking =>
          booking.status === 'cancelled' ||
          booking.payment_status === 'paid'
      )
    ) {
      return NextResponse.json(
        { error: 'This booking cannot accept another payment receipt.' },
        { status: 409 }
      )
    }

    const { data: existingReceipt, error: existingError } =
      await supabaseAdmin
        .from('payment_receipts')
        .select('id')
        .eq('booking_reference', bookingReference)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: 'Could not check existing receipt submissions.' },
        { status: 500 }
      )
    }

    if (existingReceipt) {
      return NextResponse.json(
        { error: 'A receipt is already awaiting staff review.' },
        { status: 409 }
      )
    }

    const storagePath =
      `${bookingReference}/${randomUUID()}.${extension}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('payment-receipts')
      .upload(storagePath, bytes, {
        contentType: receipt.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Receipt upload failed:', uploadError.message)

      return NextResponse.json(
        { error: 'Could not upload the receipt. Please try again.' },
        { status: 500 }
      )
    }

    const { error: insertError } = await supabaseAdmin
      .from('payment_receipts')
      .insert({
        booking_reference: bookingReference,
        storage_path: storagePath,
        transaction_reference: transactionReference,
        status: 'pending',
      })

    if (insertError) {
      console.error('Receipt record creation failed:', insertError.message)

      await supabaseAdmin.storage
        .from('payment-receipts')
        .remove([storagePath])

      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A receipt may already be awaiting review.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Could not save the receipt submission.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt submitted. Your payment is awaiting staff verification.',
    })
  } catch (error) {
    console.error(
      'Receipt submission failed:',
      error instanceof Error ? error.message : 'Unknown error'
    )

    return NextResponse.json(
      { error: 'Unable to process the receipt. Please try again.' },
      { status: 400 }
    )
  }
}
