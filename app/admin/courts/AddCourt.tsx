'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AddCourt() {
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('240')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function addCourt() {
    setMessage('')

    if (!name.trim()) {
      setMessage('Please enter a court name.')
      return
    }

    const numericPrice = Number(price)

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setMessage('Please enter a valid price.')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('courts')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        price_per_hour: numericPrice,
        status: 'available',
      })

    setLoading(false)

    if (error) {
      console.error('Add court error:', error)
      setMessage(error.message)
      return
    }

    setName('')
    setDescription('')
    setPrice('240')
    setMessage('Court added successfully.')

    setTimeout(() => {
      window.location.reload()
    }, 700)
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
          padding: '11px 18px',
          borderRadius: '8px',
          border: 'none',
          background: '#16a34a',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        + Add New Court
      </button>
    )
  }

  return (
    <div
      style={{
        marginTop: '20px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        background: '#ffffff',
      }}
    >
      <h2
        style={{
          margin: '0 0 16px',
          fontSize: '20px',
          fontWeight: 700,
        }}
      >
        Add New Court
      </h2>

      <div
        style={{
          display: 'grid',
          gap: '14px',
          maxWidth: '500px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Court Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Court 7"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '7px',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Description
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '7px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Price per Hour
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '7px',
              fontSize: '14px',
            }}
          />
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: '7px',
            background: '#f0fdf4',
            color: '#166534',
            fontSize: '14px',
          }}
        >
          New courts will be created as <strong>Available</strong>.
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={addCourt}
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: '7px',
              border: 'none',
              background: '#16a34a',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {loading ? 'Adding...' : 'Add Court'}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setMessage('')
            }}
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: '7px',
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
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
              color: message.includes('successfully')
                ? '#166534'
                : '#b91c1c',
              fontSize: '14px',
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}