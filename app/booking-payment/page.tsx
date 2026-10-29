
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import html2canvas from 'html2canvas-pro'

type PaymentSession = {
  bookingReference: string
  customerName: string
  customerEmail: string
  receiptSubmitted: boolean
  receiptSubmittedAt: string | null
  totalAmount: number
  bookingDate: string
  bookingCreatedAt: string
  slots: {
    courtName: string
    startTime: string
    endTime: string
    status: string
  }[]
  paymentStatus: 'paid' | 'cancelled' | 'unpaid'
}


type PaymentIconName =
  | 'calendar' | 'user' | 'mail' | 'court' | 'clock' | 'layers'
  | 'coins' | 'receipt' | 'wallet' | 'upload' | 'info' | 'file'

function PaymentIcon({ name, className = 'h-5 w-5' }: { name: PaymentIconName; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (name) {
    case 'calendar': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
    case 'user': return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
    case 'mail': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
    case 'court': return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18M7 7l2 2-2 2M17 13l-2 2 2 2"/></svg>
    case 'clock': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    case 'layers': return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>
    case 'coins': return <svg {...common}><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 10v4c0 1.7 3.6 3 8 3 1.3 0 2.6-.1 3.7-.4M4 14v4c0 1.7 3.6 3 8 3 1.5 0 2.9-.2 4.1-.5"/><path d="M18 15v6M15 18h6"/></svg>
    case 'receipt': return <svg {...common}><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 12h8M8 16h6"/></svg>
    case 'wallet': return <svg {...common}><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h15a3 3 0 0 1 3 3v2h-5a2 2 0 0 1 0-4h5M17 12h.01"/></svg>
    case 'upload': return <svg {...common}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>
    case 'info': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
    case 'file': return <svg {...common}><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/></svg>
  }
}

function formatTime(time: string): string {
  const [hours, minutes = '00'] = time.split(':')
  const hour = Number(hours)

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return time
  }

  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  return `${displayHour}:${minutes} ${period}`
}


function formatBookingTimestamp(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date) + ' (Philippine Time)'
}

export default function BookingPaymentPage() {
  const screenshotRef = useRef<HTMLDivElement>(null)
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const [savingScreenshot, setSavingScreenshot] = useState(false)
  const [token, setToken] = useState('')
  const tokenRef = useRef('')
  const [session, setSession] = useState<PaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [receiptSubmitted, setReceiptSubmitted] = useState(false)

  useEffect(() => {
    const urlToken = window.location.hash.startsWith('#token=')
      ? window.location.hash.slice(7)
      : ''

    const guestToken = urlToken || tokenRef.current

    if (guestToken) {
      tokenRef.current = guestToken
    }

    const reference =
      new URLSearchParams(window.location.search).get('reference') || ''

    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    )

    setToken(guestToken)

    async function loadSession() {
      if (!guestToken || !reference) {
        setError(
          'This payment link is missing information. Please use your original booking link.'
        )
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/payment-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference,
            token: guestToken,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Could not verify your booking.')
          return
        }

        setSession(result as PaymentSession)
        setReceiptSubmitted(Boolean((result as PaymentSession).receiptSubmitted))
      } catch {
        setError(
          'Unable to connect. Please check your internet and try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadSession()
  }, [])

  useEffect(() => {
    if (!session || session.paymentStatus !== 'unpaid' || !token) {
      return
    }

    let active = true

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch('/api/payment-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: session.bookingReference,
            token,
          }),
          cache: 'no-store',
        })

        if (!response.ok) return

        const result = (await response.json()) as PaymentSession

        if (active) {
          setSession(result)
          setReceiptSubmitted(Boolean(result.receiptSubmitted))
        }
      } catch {
        // Retry at the next interval.
      }
    }

    const intervalId = window.setInterval(() => {
      void checkPaymentStatus()
    }, 10000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [session?.bookingReference, session?.paymentStatus, token])

  async function saveBookingScreenshot() {
    if (!screenshotRef.current || !session) return

    setSavingScreenshot(true)

    try {
      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: '#0b0a0f',
        scale: 2,
        useCORS: true,
      })

      const link = document.createElement('a')
      link.download = `Dink-Point-${session.bookingReference}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Could not save booking screenshot:', error)
      setMessage('Could not save the screenshot. Please try again.')
    } finally {
      setSavingScreenshot(false)
    }
  }

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!session || !token || !receipt) {
      setMessage('Please select a receipt image.')
      return
    }

    if (!transactionReference.trim()) {
      setMessage('Please enter your GCash transaction reference.')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(receipt.type)) {
      setMessage('Please upload a JPG, PNG, or WebP image.')
      return
    }

    if (receipt.size > 5 * 1024 * 1024) {
      setMessage('The receipt image must be 5 MB or smaller.')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('bookingReference', session.bookingReference)
      formData.append('token', token)
      formData.append(
        'transactionReference',
        transactionReference.trim()
      )
      formData.append('receipt', receipt)

      const response = await fetch('/api/payment-receipt', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || 'Receipt submission failed.')
        return
      }

      setMessage('')
      setReceiptSubmitted(true)
      setSession(current => current ? { ...current, receiptSubmitted: true, receiptSubmittedAt: new Date().toISOString() } : current)
      setReceipt(null)
      setTransactionReference('')
    } catch {
      setMessage('Unable to submit the receipt. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-[#0b0a0f] text-white" style={{ backgroundImage: 'radial-gradient(ellipse at 12% 8%, rgba(111,82,124,0.16), transparent 38%), radial-gradient(ellipse at 90% 60%, rgba(148,166,103,0.08), transparent 32%)' }}>
      <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
        Verifying your booking...
      </div>
      </main>
    )
  }

  if (error || !session || !token) {
    return (
      <main className="min-h-screen w-full bg-[#0b0a0f] text-white" style={{ backgroundImage: 'radial-gradient(ellipse at 12% 8%, rgba(111,82,124,0.16), transparent 38%), radial-gradient(ellipse at 90% 60%, rgba(148,166,103,0.08), transparent 32%)' }}>
      <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-white">Booking Payment</h1>
        <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-red-300">
          {error || 'This payment link is invalid or expired.'}
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-lg bg-[#cfe3a0] px-4 py-3 font-semibold text-[#182016] transition hover:bg-[#d9ecb0]"
        >
          Back to Homepage
        </Link>
      </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full bg-[#0b0a0f] text-white" style={{ backgroundImage: 'radial-gradient(ellipse at 12% 8%, rgba(111,82,124,0.16), transparent 38%), radial-gradient(ellipse at 90% 60%, rgba(148,166,103,0.08), transparent 32%)' }}>
      <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-col items-center gap-2 pt-2 text-center">
        <div className="flex items-center justify-center gap-3">
          <img
            src="/images/dink-point-logo.png"
            alt="Dink Point"
            className="h-auto w-28 object-contain sm:w-32"
          />
          <span className="h-12 w-px bg-[#6f527c]" aria-hidden="true" />
          <div className="text-left leading-tight">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#d4d0d8]">PICKLEBALL</p>
            <p className="mt-1 text-sm font-bold tracking-[0.28em] text-[#cfe3a0]">PANABO</p>
          </div>
        </div>
        <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-[#6f527c]/70 to-transparent" />
      </header>

      <h1 className="text-center text-3xl font-bold tracking-tight text-white">
        {session.paymentStatus === 'paid' ? 'Congrats! Your reservation is secured!' : receiptSubmitted ? 'Court Reservation Verifying...' : 'Complete Your Booking'}
      </h1>

      {receiptSubmitted && session.paymentStatus === 'unpaid' && (
        <section className="mt-4 rounded-xl border border-[#9b72b0]/70 bg-[#24192d]/70 p-4 text-center text-[#e9dff0]">
          <p className="text-sm leading-6">
            Your slot is locked, and we're verifying your GCash payment. Your booking will be confirmed once staff approves your receipt.
          </p>
        </section>
      )}

      {session.paymentStatus === 'paid' && (
        <section className="mt-4 rounded-xl border border-[#9b72b0]/70 bg-[#24192d]/70 p-4 text-center text-[#e9dff0]">
          <p className="text-sm leading-6">
            Your reservation is confirmed. We look forward to seeing you on the court!
          </p>
        </section>
      )}

      {session.paymentStatus === 'unpaid' && !receiptSubmitted && (
        <section className="mt-4 rounded-xl border border-amber-500/60 bg-amber-950/40 p-4 text-amber-100">
          <p className="text-sm">
            Please submit your GCash receipt after payment. Your reservation will be marked pending while staff verifies the receipt.
          </p>
        </section>
      )}

      {/* This is the only booking summary and reference screenshot area. */}
      <div
        ref={screenshotRef}
        className="mt-5 rounded-2xl border border-[#8b6b9a]/75 bg-gradient-to-br from-[#1b1820] to-[#111015] p-4 text-white shadow-xl shadow-black/30"
      >
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-[#cfe3a0]">
          Dink Point Pickleball
        </h2>

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6f527c]/35 text-[#d0a9e2]">
            <PaymentIcon name="calendar" className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-bold text-white">Reservation Details</h2>
        </div>

        <div className="mt-3 space-y-1 text-sm text-gray-200">
          <p className="flex items-start gap-2"><PaymentIcon name="user" className="mt-0.5 h-4 w-4 shrink-0 text-[#bd91d0]" /><span><strong>Name:</strong> {session.customerName || 'Not available'}</span></p>
          <p className="flex items-start gap-2 break-all"><PaymentIcon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-[#bd91d0]" /><span><strong>Email:</strong> {session.customerEmail || 'Not available'}</span></p>
        </div>

        <div className="mt-4 rounded-2xl border border-[#5b4a65]/50 bg-[#1d1a22] p-4 text-gray-100">
          <p className="mb-3 flex items-start gap-2 rounded-lg border border-[#9b72b0]/35 bg-[#24192d]/50 p-3">
            <PaymentIcon name="receipt" className="mt-0.5 h-5 w-5 shrink-0 text-[#cfe3a0]" />
            <span><strong>Receipt submitted for approval:</strong>{' '}
            <span>
              {session.receiptSubmittedAt
                ? formatBookingTimestamp(session.receiptSubmittedAt)
                : 'Not submitted yet'} 
            </span></span>
          </p>
          <p className="flex items-start gap-2">
            <PaymentIcon name="calendar" className="mt-0.5 h-4 w-4 shrink-0 text-[#bd91d0]" />
            <span><strong>Playing date:</strong> {session.bookingDate}</span>
          </p>

          <p className="mt-2 flex items-start gap-2">
            <PaymentIcon name="court" className="mt-0.5 h-4 w-4 shrink-0 text-[#bd91d0]" />
            <span><strong>Courts:</strong>{' '}
            {Array.from(
              new Set(session.slots.map(slot => slot.courtName))
            ).join(', ')}</span>
          </p>

          <div className="mt-4">
            <strong className="flex items-center gap-2"><PaymentIcon name="clock" className="h-4 w-4 text-[#bd91d0]" />Selected Hours:</strong>

            <div className="mt-2 space-y-2">
              {session.slots.map((slot, index) => (
                <div
                  key={`${slot.courtName}-${slot.startTime}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#5b4a65]/60 bg-[#211e27] p-3 text-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <PaymentIcon name="clock" className="h-4 w-4 shrink-0 text-[#bd91d0]" />
                    {slot.courtName} · {formatTime(slot.startTime)}–
                    {formatTime(slot.endTime)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-[#5b4a65]/50 pt-4">
            <p className="flex items-center gap-2">
              <PaymentIcon name="layers" className="h-5 w-5 text-[#bd91d0]" />
              <strong>Total Hours:</strong> {session.slots.length}
            </p>

            <p className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold">
              <PaymentIcon name="coins" className="h-6 w-6 text-[#cfe3a0]" />
              <strong>Total:</strong>{' '}
              <span className="text-3xl font-extrabold text-[#cfe3a0]">₱{session.totalAmount.toLocaleString('en-PH', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}</span>
            </p>
          </div>
        </div>

        {session.paymentStatus === 'paid' && (
          <section className="mt-4 rounded-xl border border-[#6f527c]/70 bg-[#17151c] p-4 text-white">
            <h2 className="text-xl font-semibold">Payment received</h2>
            <p className="mt-2">
              Your payment has been recorded. Save your booking reference
              for future inquiries.
            </p>

            <div className="mt-4 rounded-lg border border-[#5b4a65]/50 bg-[#211e27] p-4">
              <p className="text-sm font-medium text-gray-400">
                Your booking reference
              </p>
              <p className="mt-1 break-all text-lg font-bold">
                {session.bookingReference}
              </p>
            </div>
          </section>
        )}

        {session.paymentStatus === 'cancelled' && (
          <section className="mt-4 rounded-xl border border-[#6f527c]/70 bg-[#17151c] p-4 text-white">
            <h2 className="text-xl font-semibold">Booking cancelled</h2>
            <p className="mt-2">
              This booking has been cancelled. Please contact staff if you
              believe this is an error.
            </p>
            <p className="mt-3 text-sm text-gray-400">
              Booking reference
            </p>
            <p className="mt-1 break-all font-bold">
              {session.bookingReference}
            </p>
          </section>
        )}
      </div>

      {session.paymentStatus === 'paid' && (
        <>
          <button
            type="button"
            onClick={() => void saveBookingScreenshot()}
            disabled={savingScreenshot}
            className="mt-3 w-full rounded-lg border border-[#a77bc8]/80 px-4 py-3 font-semibold text-[#d0a9e2] transition hover:bg-[#2b1d35]/70 disabled:opacity-50"
          >
            {savingScreenshot
              ? 'Saving Screenshot...'
              : 'Save Booking Screenshot'}
          </button>

          <Link
            href="/"
            className="mt-4 block w-full rounded-lg bg-[#cfe3a0] px-4 py-3 text-center font-semibold text-[#182016] transition hover:bg-[#d9ecb0]"
          >
            Back to Homepage
          </Link>
        </>
      )}

      {session.paymentStatus === 'unpaid' && !receiptSubmitted && (
        <>
          <section className="mt-6 rounded-2xl border border-[#8b6b9a]/75 bg-gradient-to-br from-[#1b1820] to-[#111015] p-4 text-white shadow-lg shadow-black/20">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6f527c]/35 text-[#d0a9e2]">
                <PaymentIcon name="wallet" className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold">Pay with GCash</h2>
            </div>
            <img
              src="/images/QR.png"
              alt="Dink Point Pickleball GCash QR code"
              className="mx-auto mt-4 w-full max-w-[260px] rounded-sm bg-white p-2 shadow-lg shadow-black/30"
            />
            <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-gray-300">
              <PaymentIcon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-[#bd91d0]" />
              <span>Pay the exact total shown above. Check the recipient details
              in GCash before confirming.</span>
            </p>
          </section>

          <form
            onSubmit={submitReceipt}
            className="mt-6 space-y-4 rounded-2xl border border-[#8b6b9a]/75 bg-gradient-to-br from-[#1b1820] to-[#111015] p-4 text-white shadow-lg shadow-black/20"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#cfe3a0]/15 text-[#cfe3a0]">
                <PaymentIcon name="upload" className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold">Submit Payment Receipt</h2>
            </div>

            <div>
              <label
                htmlFor="transactionReference"
                className="mb-1 block text-sm font-medium text-gray-200"
              >
                GCash transaction reference
              </label>
              <input
                id="transactionReference"
                name="transactionReference"
                value={transactionReference}
                onChange={event =>
                  setTransactionReference(event.target.value)
                }
                required
                minLength={4}
                maxLength={100}
                autoComplete="off"
                className="w-full rounded-lg border border-[#5b4a65] bg-[#0b0a0f] p-3 text-white placeholder:text-[#8e8797] focus:border-[#bd91d0] focus:outline-none focus:ring-2 focus:ring-[#bd91d0]/25"
                placeholder="Enter your transaction reference"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="receipt"
                className="block text-sm font-medium text-gray-200"
              >
                GCash receipt image <span className="text-[#bd91d0]">(Required)</span>
              </label>
              <input
                ref={receiptInputRef}
                id="receipt"
                name="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={event => {
                  const selectedFile = event.target.files?.[0] || null

                  if (selectedFile && !['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
                    setReceipt(null)
                    event.target.value = ''
                    setMessage('Please upload a JPG, PNG, or WebP image.')
                    return
                  }

                  if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
                    setReceipt(null)
                    event.target.value = ''
                    setMessage('The receipt image must be 5 MB or smaller.')
                    return
                  }

                  setMessage('')
                  setReceipt(selectedFile)
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#a77bc8]/80 bg-[#0b0a0f] px-4 py-3 font-semibold text-[#d0a9e2] transition hover:bg-[#9b72b0]/10 focus:outline-none focus:ring-2 focus:ring-[#bd91d0]/40"
                aria-describedby="receipt-help receipt-selected"
              >
                <PaymentIcon name="upload" className="h-5 w-5" />
                {receipt ? 'Change GCash Receipt' : 'Upload GCash Receipt'}
              </button>
              <p id="receipt-help" className="text-xs leading-5 text-gray-400">
                Upload a JPG, PNG, or WebP image, up to 5 MB. You must attach your receipt before submitting.
              </p>
              <p id="receipt-selected" className="flex items-start gap-2 break-all text-sm text-gray-200" aria-live="polite">
                <PaymentIcon name="file" className="mt-0.5 h-4 w-4 shrink-0 text-[#bd91d0]" />
                <span>{receipt ? `Selected: ${receipt.name}` : 'No receipt uploaded yet.'}</span>
              </p>
            </div>

            {receipt && (
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#cfe3a0] px-4 py-3 font-semibold text-[#182016] transition hover:bg-[#d9ecb0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Receipt'}
              </button>
            )}

            {message && (
              <p role="status" className="rounded-lg border border-[#5b4a65]/50 bg-[#211e27] p-3 text-sm text-gray-100">
                {message}
              </p>
            )}

            <p className="flex items-start gap-2 rounded-xl border border-[#6f527c]/45 bg-[#24192d]/40 p-3 text-sm leading-6 text-gray-300">
              <PaymentIcon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-[#bd91d0]" />
              <span>Your booking remains unconfirmed until staff verifies the
              actual GCash transaction.</span>
            </p>
          </form>
        </>
      )}
    </div>
      </main>
  )
}
