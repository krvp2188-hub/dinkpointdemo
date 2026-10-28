 'use client'

type Props = {
  startDate: string
  endDate: string
}

function getSingaporeDateString(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))

  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

export default function ReportFilters({ startDate, endDate }: Props) {
  const todayString = getSingaporeDateString()
  const sevenDaysAgo = addDays(todayString, -6)
  const thirtyDaysAgo = addDays(todayString, -29)
  const firstDayOfMonth = `${todayString.slice(0, 7)}-01`

  const updateDateRange = (start: string, end: string) => {
    if (!start || !end || start > end) return

    const params = new URLSearchParams()
    params.set('start', start)
    params.set('end', end)

    window.location.href = `/admin/reports?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateDateRange(todayString, todayString)}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
        >
          Today
        </button>

        <button
          type="button"
          onClick={() => updateDateRange(sevenDaysAgo, todayString)}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
        >
          Last 7 Days
        </button>

        <button
          type="button"
          onClick={() => updateDateRange(thirtyDaysAgo, todayString)}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
        >
          Last 30 Days
        </button>

        <button
          type="button"
          onClick={() => updateDateRange(firstDayOfMonth, todayString)}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
        >
          This Month
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="report-start" className="mb-1 block text-sm">
            Start date
          </label>
          <input
            id="report-start"
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) =>
              updateDateRange(event.target.value, endDate)
            }
            className="rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="report-end" className="mb-1 block text-sm">
            End date
          </label>
          <input
            id="report-end"
            type="date"
            value={endDate}
            min={startDate}
            max={todayString}
            onChange={(event) =>
              updateDateRange(startDate, event.target.value)
            }
            className="rounded-lg border px-3 py-2"
          />
        </div>
      </div>
    </div>
  )
}