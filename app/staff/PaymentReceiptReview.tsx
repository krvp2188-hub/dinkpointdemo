'use client'

import { useCallback, useEffect, useState } from 'react'

type Receipt = {
  id: string
  bookingReference: string
  transactionReference: string
  submittedAt: string
  status: string
  staffNote: string | null
  imageUrl: string | null
}

type EmailRecord = {
  booking_reference: string
  status: string
  attempt_count: number
  last_error: string | null
  updated_at: string
  sent_at: string | null
}

function emailStatusLabel(status: string): string {
  switch (status) {
    case 'sent':
      return 'Sent successfully to Resend'
    case 'failed':
      return 'Failed — retry available'
    case 'sending':
      return 'Sending / may be stuck'
    case 'pending':
      return 'Pending'
    default:
      return status
  }
}

function emailStatusClass(status: string): string {
  switch (status) {
    case 'sent':
      return 'border-green-200 bg-green-50 text-green-800'
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'sending':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700'
  }
}

export default function PaymentReceiptReview() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [emailRecords, setEmailRecords] = useState<EmailRecord[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [retryingReference, setRetryingReference] = useState('')
  const [message, setMessage] = useState('')
  const [emailLoadError, setEmailLoadError] = useState('')

  const loadReceipts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)

    try {
      const response = await fetch('/api/pending-receipts', {
        cache: 'no-store',
      })
      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || 'Could not load receipts.')
        return
      }

      setReceipts(result.receipts || [])
    } catch {
      setMessage('Unable to load receipts. Please try again.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  const loadEmailRecords = useCallback(async () => {
    try {
      const response = await fetch('/api/booking-confirmation-email', {
        cache: 'no-store',
      })
      const result = await response.json()

      if (!response.ok) {
        setEmailLoadError(result.error || 'Could not load email status.')
        return
      }

      setEmailRecords(result.emails || [])
      setEmailLoadError('')
    } catch {
      setEmailLoadError('Unable to load confirmation email statuses.')
    }
  }, [])

  useEffect(() => {
    void loadReceipts()
    void loadEmailRecords()

    const intervalId = window.setInterval(() => {
      void loadReceipts(false)
      void loadEmailRecords()
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [loadReceipts, loadEmailRecords])

  async function reviewReceipt(receipt: Receipt, action: 'approve' | 'reject') {
    if (action === 'reject') {
      const confirmation = window.prompt(
        'Type REJECT to reject this receipt:'
      )
      if (confirmation !== 'REJECT') return
    }

    setBusyId(receipt.id)
    setMessage('')

    try {
      const response = await fetch('/api/review-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: receipt.id,
          action,
          staffNote: notes[receipt.id]?.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || 'Receipt review failed.')
        return
      }

      if (action === 'reject') {
        setMessage(`Receipt rejected for ${receipt.bookingReference}.`)
      } else if (
        result.emailStatus === 'sent' ||
        result.emailStatus === 'already_sent'
      ) {
        setMessage(
          `Receipt approved for ${receipt.bookingReference}. Confirmation email sent.`
        )
      } else {
        setMessage(
          `Receipt approved for ${receipt.bookingReference}, but email status is ${result.emailStatus || 'unknown'}. Check Confirmation Email Status below.`
        )
      }

      await Promise.all([loadReceipts(false), loadEmailRecords()])
    } catch {
      setMessage('Unable to submit your review. Please try again.')
    } finally {
      setBusyId('')
    }
  }

  async function retryConfirmationEmail(bookingReference: string) {
    setRetryingReference(bookingReference)
    setMessage('')

    try {
      const response = await fetch('/api/booking-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingReference }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(
          result.error ||
            `Email retry failed for ${bookingReference}.`
        )
      } else {
        setMessage(
          result.emailStatus === 'already_sent'
            ? `Confirmation email was already marked sent for ${bookingReference}.`
            : `Confirmation email sent for ${bookingReference}.`
        )
      }

      await loadEmailRecords()
    } catch {
      setMessage(
        `Unable to retry the confirmation email for ${bookingReference}.`
      )
    } finally {
      setRetryingReference('')
    }
  }

  return (
    <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Pending GCash Receipts</h2>
          <p className="mt-1 text-sm text-gray-600">
            Verify the actual transaction before approving a payment.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadReceipts()
            void loadEmailRecords()
          }}
          disabled={loading}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-4 rounded-lg bg-gray-100 p-3 text-sm">
          {message}
        </p>
      )}

      <div className="mt-8 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold">Confirmation Email Status</h3>
            <p className="mt-1 text-sm text-gray-600">
              Recent sent emails and emails that may need a retry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadEmailRecords()}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Refresh email status
          </button>
        </div>

        {emailLoadError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {emailLoadError}
          </p>
        )}

        {!emailLoadError && emailRecords.length === 0 ? (
          <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            No confirmation email records were returned. If you have already
            approved a booking, refresh this section or check the API response.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {emailRecords.map((item) => (
              <article
                key={item.booking_reference}
                className="rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-semibold">
                      {item.booking_reference}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${emailStatusClass(item.status)}`}
                    >
                      {emailStatusLabel(item.status)}
                    </span>
                    <p className="mt-2 text-sm text-gray-600">
                      Attempts: {item.attempt_count}
                    </p>
                    <p className="text-sm text-gray-600">
                      Last updated:{' '}
                      {new Date(item.updated_at).toLocaleString()}
                    </p>
                    {item.sent_at && (
                      <p className="text-sm text-green-700">
                        Sent at: {new Date(item.sent_at).toLocaleString()}
                      </p>
                    )}
                    {item.last_error && (
                      <p className="mt-2 break-words text-sm text-red-700">
                        Last error: {item.last_error}
                      </p>
                    )}
                  </div>

                  {item.status === 'failed' && (
                    <button
                      type="button"
                      disabled={retryingReference !== ''}
                      onClick={() =>
                        void retryConfirmationEmail(item.booking_reference)
                      }
                      className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
                    >
                      {retryingReference === item.booking_reference
                        ? 'Retrying...'
                        : 'Retry email'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-bold">Receipts awaiting review</h3>

        {loading ? (
          <p className="mt-5">Loading pending receipts...</p>
        ) : receipts.length === 0 ? (
          <p className="mt-5 text-gray-600">
            No pending receipts to review.
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            {receipts.map((receipt) => (
              <article
                key={receipt.id}
                className="rounded-xl border p-4"
              >
                <p className="text-sm text-gray-500">Booking reference</p>
                <p className="font-semibold">{receipt.bookingReference}</p>

                <p className="mt-3 text-sm text-gray-500">
                  GCash transaction reference
                </p>
                <p className="font-medium">{receipt.transactionReference}</p>

                <p className="mt-3 text-sm text-gray-500">Submitted</p>
                <p>{new Date(receipt.submittedAt).toLocaleString()}</p>

                {receipt.imageUrl ? (
                  <a
                    href={receipt.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block text-blue-700 underline"
                  >
                    Open private receipt image
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-red-600">
                    Receipt image unavailable. Do not approve without
                    verification.
                  </p>
                )}

                <div className="mt-4">
                  <label
                    htmlFor={`note-${receipt.id}`}
                    className="mb-1 block text-sm font-medium"
                  >
                    Staff note (optional)
                  </label>
                  <textarea
                    id={`note-${receipt.id}`}
                    value={notes[receipt.id] || ''}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [receipt.id]: event.target.value.slice(0, 500),
                      }))
                    }
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-lg border p-3"
                    placeholder="Record verification details or reason for rejection"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busyId !== ''}
                    onClick={() => void reviewReceipt(receipt, 'approve')}
                    className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    {busyId === receipt.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== ''}
                    onClick={() => void reviewReceipt(receipt, 'reject')}
                    className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-50"
                  >
                    Reject Receipt
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
