'use client'

import { useCallback, useEffect, useState } from 'react'

type EmailRecord = {
  booking_reference: string
  status: string
  attempt_count: number
  last_error: string | null
  updated_at: string
}

function statusLabel(status: string) {
  if (status === 'failed') return 'Failed — retry available'
  if (status === 'sending') return 'Sending / may be stuck'
  if (status === 'pending') return 'Pending'
  return status
}

function statusClass(status: string) {
  if (status === 'failed') return 'border-red-200 bg-red-50 text-red-800'
  if (status === 'sending') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-gray-200 bg-gray-50 text-gray-700'
}

export default function ConfirmationEmailStatus() {
  const [emails, setEmails] = useState<EmailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [retryingReference, setRetryingReference] = useState('')

  const loadEmails = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch('/api/booking-confirmation-email', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) {
        setLoadError(result.error || 'Could not load confirmation email status.')
        return
      }
      setEmails(result.emails || [])
      setLoadError('')
    } catch {
      setLoadError('Unable to load confirmation email statuses.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEmails()
    const intervalId = window.setInterval(() => void loadEmails(false), 30000)
    return () => window.clearInterval(intervalId)
  }, [loadEmails])

  async function retryEmail(bookingReference: string) {
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
        setMessage(result.error || `Email retry failed for ${bookingReference}.`)
      } else {
        setMessage(result.emailStatus === 'already_sent'
          ? `Confirmation email was already marked sent for ${bookingReference}.`
          : `Confirmation email retry completed for ${bookingReference}.`)
      }
      await loadEmails(false)
    } catch {
      setMessage(`Unable to retry the confirmation email for ${bookingReference}.`)
    } finally {
      setRetryingReference('')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">DinkPoint Panabo · Staff</p>            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Confirmation Email Status</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review failed confirmation emails and sending attempts that may be stuck. This page refreshes every 30 seconds.
            </p>
          </div>
          <button type="button" onClick={() => void loadEmails()} disabled={loading} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
            {loading ? 'Loading...' : 'Refresh status'}
          </button>
        </div>

        {message && <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
        {loadError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Emails needing attention</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              The current status API returns failed emails and sending attempts older than 10 minutes. Successfully sent emails are not included in this queue.
            </p>
          </div>

          {loading ? (
            <p className="py-6 text-gray-600">Loading email statuses...</p>
          ) : !loadError && emails.length === 0 ? (
            <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">No failed or stale confirmation emails were returned.</p>
          ) : (
            <div className="space-y-3">
              {emails.map((item) => (
                <article key={item.booking_reference} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-bold text-slate-900 sm:text-base">{item.booking_reference}</p>
                      <span className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Attempts: {item.attempt_count}</p>
                      <p className="text-sm text-slate-600">Last updated: {new Date(item.updated_at).toLocaleString()}</p>
                      {item.last_error && <p className="mt-2 break-words rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Last error: {item.last_error}</p>}
                    </div>
                    {item.status === 'failed' && (
                      <button type="button" disabled={retryingReference !== ''} onClick={() => void retryEmail(item.booking_reference)} className="min-h-11 w-full rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50 sm:w-auto">
                        {retryingReference === item.booking_reference ? 'Retrying...' : 'Retry email'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
