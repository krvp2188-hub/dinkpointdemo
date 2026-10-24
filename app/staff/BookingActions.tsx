'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type BookingActionsProps = {
  bookingReference: string
  status: string
  paymentStatus: string
}

export default function BookingActions({
  bookingReference,
  status,
  paymentStatus,
}: BookingActionsProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function manageBooking(
    action: 'paid' | 'confirm' | 'cancel' | 'complete'
  ) {
    setMessage('')
    setLoading(true)

    let paymentReference: string | null = null

    if (action === 'paid') {
      paymentReference =
        window.prompt('Enter payment reference (optional):') || null
    }

    const { error } = await supabase.rpc('manage_booking', {
      p_booking_reference: bookingReference,
      p_action: action,
      p_payment_reference: paymentReference,
    })

    setLoading(false)

    if (error) {
      console.error('Manage booking error:', error)
      setMessage(error.message)
      return
    }

    setMessage('Updated successfully.')

    // Refresh the server-rendered Staff dashboard
    window.location.reload()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      {paymentStatus !== 'paid' && status !== 'cancelled' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => manageBooking('paid')}
          style={buttonStyle}
        >
          {loading ? 'Updating...' : 'Mark Paid'}
        </button>
      )}

      {status === 'pending' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => manageBooking('confirm')}
          style={buttonStyle}
        >
          Confirm
        </button>
      )}

      {status !== 'cancelled' && status !== 'completed' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            const confirmed = window.confirm(
              'Are you sure you want to cancel this booking?'
            )

            if (confirmed) {
              manageBooking('cancel')
            }
          }}
          style={cancelButtonStyle}
        >
          Cancel
        </button>
      )}

      {status === 'confirmed' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => manageBooking('complete')}
          style={buttonStyle}
        >
          Complete
        </button>
      )}

      {message && (
        <span
          style={{
            width: '100%',
            fontSize: '12px',
            color: '#666',
          }}
        >
          {message}
        </span>
      )}
    </div>
  )
}

const buttonStyle = {
  border: 'none',
  borderRadius: '6px',
  padding: '7px 10px',
  cursor: 'pointer',
  background: '#111827',
  color: 'white',
  fontSize: '12px',
}

const cancelButtonStyle = {
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '7px 10px',
  cursor: 'pointer',
  background: 'white',
  color: '#b91c1c',
  fontSize: '12px',
}