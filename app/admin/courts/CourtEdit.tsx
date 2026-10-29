'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Court = {
  id: string
  name: string
  description: string | null
  price_per_hour: number | null
  status: string
}

export default function CourtEdit({
  court,
}: {
  court: Court
}) {
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(court.name)
  const [description, setDescription] = useState(
    court.description || ''
  )
  const [price, setPrice] = useState(
    String(court.price_per_hour ?? '')
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function saveCourt() {
    setMessage('')

    if (!name.trim()) {
      setMessage('Court name is required.')
      return
    }

    const numericPrice = Number(price)

    if (
      price.trim() === '' ||
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      setMessage('Please enter a valid price.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('courts')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        price_per_hour: numericPrice,
      })
      .eq('id', court.id)

    setSaving(false)

    if (error) {
      console.error('Update court error:', error)
      setMessage(error.message)
      return
    }

    setMessage('Court updated successfully.')
    setEditing(false)

    window.location.reload()
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          padding: '9px 14px',
          borderRadius: '7px',
          border: '1px solid #ddd',
          background: 'white',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        ✏️ Edit
      </button>
    )
  }

  return (
    <div
      style={{
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #eee',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: '14px',
        }}
      >
        <label>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            Court Name
          </div>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '7px',
            }}
          />
        </label>

        <label>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            Description
          </div>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '7px',
              resize: 'vertical',
            }}
          />
        </label>

        <label>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            Price Per Hour
          </div>

          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={(event) =>
              setPrice(event.target.value)
            }
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '7px',
            }}
          />
        </label>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={saveCourt}
            disabled={saving}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '7px',
              background: '#115e59',
              color: 'white',
              cursor: saving
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setName(court.name)
              setDescription(
                court.description || ''
              )
              setPrice(
                String(
                  court.price_per_hour ?? ''
                )
              )
              setMessage('')
            }}
            disabled={saving}
            style={{
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '7px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>

        {message && (
          <div
            style={{
              fontSize: '14px',
              color: message.includes('successfully')
                ? '#166534'
                : '#b91c1c',
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}