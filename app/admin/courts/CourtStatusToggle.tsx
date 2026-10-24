'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CourtStatusToggle({
  courtId,
  status,
}: {
  courtId: string
  status: string
}) {
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const isAvailable = status === 'available'

  async function toggleStatus() {
    const newStatus = isAvailable
      ? 'inactive'
      : 'available'

    const action = isAvailable
      ? 'make inactive'
      : 'make available'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this court?`
    )

    if (!confirmed) {
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('courts')
      .update({
        status: newStatus,
      })
      .eq('id', courtId)

    setLoading(false)

    if (error) {
      console.error(
        'Update court status error:',
        error
      )

      setMessage(error.message)
      return
    }

    window.location.reload()
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleStatus}
        disabled={loading}
        style={{
          padding: '9px 14px',
          borderRadius: '7px',
          border: '1px solid #ddd',
          background: isAvailable
            ? '#fff7ed'
            : '#ecfdf5',
          color: isAvailable
            ? '#c2410c'
            : '#166534',
          cursor: loading
            ? 'not-allowed'
            : 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {loading
          ? 'Updating...'
          : isAvailable
            ? 'Set Inactive'
            : 'Set Available'}
      </button>

      {message && (
        <div
          style={{
            marginTop: '8px',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}