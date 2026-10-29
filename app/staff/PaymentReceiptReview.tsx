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

export default function PaymentReceiptReview() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')

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

  useEffect(() => {
    void loadReceipts()

    const intervalId = window.setInterval(() => {
      void loadReceipts(false)
      }, 30000)

    return () => window.clearInterval(intervalId)
  }, [loadReceipts])

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
          `Receipt approved for ${receipt.bookingReference}. Check Confirmation Email Status in the staff navigation if the email needs attention.`
        )
      }

      await loadReceipts(false)
    } catch {
      setMessage('Unable to submit your review. Please try again.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Pending GCash Receipts</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Verify the actual transaction before approving a payment.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadReceipts()
          }}
          disabled={loading}
          className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {message}
        </p>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5 sm:mt-8 sm:pt-6">
        <h3 className="text-base font-bold text-slate-800 sm:text-lg">Receipts awaiting review</h3>

        {loading ? (
          <p className="mt-5">Loading pending receipts...</p>
        ) : receipts.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No pending receipts to review.
          </p>
        ) : (
          <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
            {receipts.map((receipt) => (
              <article
                key={receipt.id}
                className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking reference</p>
                <p className="mt-1 break-all font-bold text-slate-900">{receipt.bookingReference}</p>

                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  GCash transaction reference
                </p>
                <p className="mt-1 break-words font-semibold text-slate-800">{receipt.transactionReference}</p>

                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</p>
                <p className="mt-1 text-sm text-slate-800">{new Date(receipt.submittedAt).toLocaleString()}</p>

                {receipt.imageUrl ? (
                  <a
                    href={receipt.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 underline"
                  >
                    Open private receipt image
                  </a>
                ) : (
                  <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                    Receipt image unavailable. Do not approve without
                    verification.
                  </p>
                )}

                <div className="mt-4">
                  <label
                    htmlFor={`note-${receipt.id}`}
                    className="mb-1 block text-sm font-semibold text-slate-700"
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
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    placeholder="Record verification details or reason for rejection"
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    disabled={busyId !== ''}
                    onClick={() => void reviewReceipt(receipt, 'approve')}
                    className="min-h-11 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {busyId === receipt.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== ''}
                    onClick={() => void reviewReceipt(receipt, 'reject')}
                    className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
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
