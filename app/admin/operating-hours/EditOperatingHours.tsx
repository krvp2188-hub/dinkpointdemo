'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type EditOperatingHoursProps = {
  id: string
  openTime: string
  closeTime: string
  isOpen: boolean
}

export default function EditOperatingHours({
  id,
  openTime,
  closeTime,
  isOpen,
}: EditOperatingHoursProps) {
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [newOpenTime, setNewOpenTime] = useState(openTime.slice(0, 5))
  const [newCloseTime, setNewCloseTime] = useState(
    closeTime.slice(0, 5)
  )
  const [newIsOpen, setNewIsOpen] = useState(isOpen)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function saveChanges() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('operating_hours')
      .update({
        open_time: newOpenTime,
        close_time: newCloseTime,
        is_open: newIsOpen,
      })
      .eq('id', id)

    setLoading(false)

    if (error) {
      console.error('Update operating hours error:', error)
      setMessage(error.message)
      return
    }

    setMessage('Saved successfully.')

    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setMessage('')
        }}
        style={{
          padding: '8px 14px',
          borderRadius: '7px',
          border: '1px solid #d1d5db',
          background: 'white',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '13px',
        }}
      >
        Edit
      </button>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: '10px',
        minWidth: '220px',
      }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        <input
          type="checkbox"
          checked={newIsOpen}
          onChange={(event) => setNewIsOpen(event.target.checked)}
        />
        Open
      </label>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '4px',
          }}
        >
          Opening time
        </label>

        <input
          type="time"
          value={newOpenTime}
          onChange={(event) => setNewOpenTime(event.target.value)}
          disabled={!newIsOpen}
          style={{
            padding: '7px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '4px',
          }}
        >
          Closing time
        </label>

        <input
          type="time"
          value={newCloseTime}
          onChange={(event) => setNewCloseTime(event.target.value)}
          disabled={!newIsOpen}
          style={{
            padding: '7px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={saveChanges}
          disabled={loading}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: '#16a34a',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setMessage('')
          }}
          disabled={loading}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          Cancel
        </button>
      </div>

      {message && (
        <div
          style={{
            fontSize: '13px',
            color: message.includes('successfully')
              ? '#166534'
              : '#b91c1c',
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}