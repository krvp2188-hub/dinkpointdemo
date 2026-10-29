'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Override = {
  id: string
  start_date: string
  end_date: string
  open_time: string | null
  close_time: string | null
  is_open: boolean
  note: string | null
}

type Props = {
  initialOverrides: Override[]
  loadError?: string
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function formatDate(value: string) {
  if (!value) return value
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function DateSpecificOperatingHours({ initialOverrides, loadError = '' }: Props) {
  const supabase = createClient()
  const [overrides, setOverrides] = useState(initialOverrides)
  const [mode, setMode] = useState<'date' | 'week' | 'range'>('date')
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [endDate, setEndDate] = useState('')
  const [openTime, setOpenTime] = useState('06:00')
  const [closeTime, setCloseTime] = useState('02:00')
  const [isOpen, setIsOpen] = useState(true)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const effectiveEndDate = useMemo(() => {
    if (mode === 'date') return startDate
    if (mode === 'week') return addDays(startDate, 6)
    return endDate
  }, [mode, startDate, endDate])

  async function saveOverride() {
    setMessage('')
    setError('')

    if (!startDate || !effectiveEndDate) {
      setError('Please select a start and end date.')
      return
    }
    if (effectiveEndDate < startDate) {
      setError('The end date must be on or after the start date.')
      return
    }
    if (isOpen && !openTime) {
      setError('Please choose an opening time.')
      return
    }
    if (isOpen && !closeTime) {
      setError('Please choose a closing time.')
      return
    }

    setSaving(true)
    const { data, error: saveError } = await supabase
      .from('operating_hours_overrides')
      .insert({
        start_date: startDate,
        end_date: effectiveEndDate,
        open_time: isOpen ? openTime : null,
        close_time: isOpen ? closeTime : null,
        is_open: isOpen,
        note: note.trim() || null,
      })
      .select('id, start_date, end_date, open_time, close_time, is_open, note')
      .single()
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setOverrides((current) => [...current, data].sort((a, b) => a.start_date.localeCompare(b.start_date)))
    setMessage('Special schedule saved.')
    setNote('')
  }

  async function deleteOverride(id: string) {
    setMessage('')
    setError('')
    setDeletingId(id)
    const { error: deleteError } = await supabase
      .from('operating_hours_overrides')
      .delete()
      .eq('id', id)
    setDeletingId('')

    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setOverrides((current) => current.filter((item) => item.id !== id))
    setMessage('Special schedule removed. The regular weekly schedule will apply again for those dates.')
  }

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '9px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '7px',
    background: 'white',
    color: '#111827',
  }

  return (
    <section
      style={{
        margin: '22px 0 28px',
        padding: '22px',
        border: '1px solid #dbe3ef',
        borderRadius: '12px',
        background: '#ffffff',
      }}
    >
      <h2 style={{ margin: '0 0 6px', fontSize: '21px', fontWeight: 700 }}>
        Date-Specific Schedule
      </h2>
      <p style={{ margin: '0 0 18px', color: '#6b7280', fontSize: '14px', lineHeight: 1.5 }}>
        Add temporary hours or close the courts for a date, a full seven-day week, or a custom date range.
        These settings are intended to override the regular weekly schedule.
      </p>

      {loadError && (
        <p style={{ padding: '10px', background: '#fff7ed', color: '#9a3412', borderRadius: '7px', fontSize: '13px' }}>
          Could not load saved special schedules: {loadError}. Make sure you have run the SQL setup provided with this update.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
        <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
          Schedule applies to
          <select value={mode} onChange={(event) => setMode(event.target.value as 'date' | 'week' | 'range')} style={fieldStyle}>
            <option value="date">One specific date</option>
            <option value="week">A full 7-day week</option>
            <option value="range">Custom date range</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
          {mode === 'week' ? 'First day of schedule' : 'Start date'}
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={fieldStyle} />
        </label>
        {mode === 'range' && (
          <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            End date
            <input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} style={fieldStyle} />
          </label>
        )}
        {isOpen && (
          <>
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
              Opening time
              <input type="time" value={openTime} onChange={(event) => setOpenTime(event.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
              Closing time
              <input type="time" value={closeTime} onChange={(event) => setCloseTime(event.target.value)} style={fieldStyle} />
            </label>
          </>
        )}
        <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
          Note (optional)
          <input type="text" maxLength={120} placeholder="e.g. Tournament, holiday" value={note} onChange={(event) => setNote(event.target.value)} style={fieldStyle} />
        </label>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '9px', margin: '16px 0', fontSize: '14px', fontWeight: 600 }}>
        <input type="checkbox" checked={!isOpen} onChange={(event) => setIsOpen(!event.target.checked)} />
        Close courts for this period
      </label>

      {mode === 'week' && startDate && (
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#4b5563' }}>
          This schedule will cover {formatDate(startDate)} through {formatDate(effectiveEndDate)}.
        </p>
      )}
      {mode === 'range' && startDate && effectiveEndDate && (
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#4b5563' }}>
          This schedule will cover {formatDate(startDate)} through {formatDate(effectiveEndDate)}.
        </p>
      )}

      <button type="button" onClick={saveOverride} disabled={saving} style={{ padding: '10px 15px', border: 0, borderRadius: '7px', background: saving ? '#9ca3af' : '#1d4ed8', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving...' : 'Save Special Schedule'}
      </button>

      {(message || error) && (
        <p role="status" style={{ margin: '12px 0 0', color: error ? '#b91c1c' : '#166534', fontSize: '13px' }}>
          {error || message}
        </p>
      )}

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 700 }}>Saved Special Schedules</h3>
        {overrides.length === 0 ? (
          <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>No date-specific schedules have been added.</p>
        ) : (
          <div style={{ display: 'grid', gap: '9px' }}>
            {overrides.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '14px' }}>
                    {item.start_date === item.end_date
                      ? formatDate(item.start_date)
                      : `${formatDate(item.start_date)} – ${formatDate(item.end_date)}`}
                  </strong>
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: item.is_open ? '#166534' : '#991b1b' }}>
                    {item.is_open ? `Open ${String(item.open_time || '').slice(0, 5)} – ${String(item.close_time || '').slice(0, 5)}` : 'Courts closed'}
                  </span>
                  {item.note && <span style={{ display: 'block', marginTop: '3px', fontSize: '12px', color: '#6b7280' }}>{item.note}</span>}
                </div>
                <button type="button" onClick={() => deleteOverride(item.id)} disabled={deletingId === item.id} style={{ padding: '7px 10px', border: '1px solid #fecaca', borderRadius: '6px', background: 'white', color: '#b91c1c', fontWeight: 600, cursor: deletingId === item.id ? 'not-allowed' : 'pointer' }}>
                  {deletingId === item.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
