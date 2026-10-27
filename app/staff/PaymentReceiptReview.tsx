
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
    setMessage('')
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
    // Approval proceeds directly when staff clicks the button.
    // Rejection keeps a confirmation prompt to prevent accidental rejection.
    if (action === 'reject') {
      const confirmation = window.prompt('Type REJECT to reject this receipt:')
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

      setMessage(
        action === 'approve'
          ? `Receipt approved for ${receipt.bookingReference}.`
          : `Receipt rejected for ${receipt.bookingReference}.`
      )

await loadReceipts(false)
    } catch {
      setMessage('Unable to submit your review. Please try again.')
    } finally {
      setBusyId('')
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
          onClick={() => void loadReceipts()}
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

      {loading ? (
        <p className="mt-5">Loading pending receipts...</p>
      ) : receipts.length === 0 ? (
        <p className="mt-5 text-gray-600">No pending receipts to review.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {receipts.map(receipt => (
            <article key={receipt.id} className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Booking reference</p>
              <p className="font-semibold">{receipt.bookingReference}</p>

              <p className="mt-3 text-sm text-gray-500">GCash transaction reference</p>
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
                  Receipt image unavailable. Do not approve without verification.
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
                  onChange={event =>
                    setNotes(current => ({
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
    </section>
  )
}
