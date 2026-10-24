'use client'

type Props = {
  startDate: string
  endDate: string
}

export default function ReportFilters({
  startDate,
  endDate,
}: Props) {
  const updateDateRange = (
    start: string,
    end: string
  ) => {
    const params = new URLSearchParams()

    params.set('start', start)
    params.set('end', end)

    window.location.href =
      `/admin/reports?${params.toString()}`
  }

  const formatDate = (date: Date) =>
    date.toISOString().split('T')[0]

  const today = new Date()

  const todayString = formatDate(today)

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 29)

  const firstDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  )

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: '16px',
        }}
      >
        Report Period
      </h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() =>
            updateDateRange(
              todayString,
              todayString
            )
          }
          style={quickButtonStyle}
        >
          Today
        </button>

        <button
          type="button"
          onClick={() =>
            updateDateRange(
              formatDate(sevenDaysAgo),
              todayString
            )
          }
          style={quickButtonStyle}
        >
          Last 7 Days
        </button>

        <button
          type="button"
          onClick={() =>
            updateDateRange(
              formatDate(thirtyDaysAgo),
              todayString
            )
          }
          style={quickButtonStyle}
        >
          Last 30 Days
        </button>

        <button
          type="button"
          onClick={() =>
            updateDateRange(
              formatDate(firstDayOfMonth),
              todayString
            )
          }
          style={quickButtonStyle}
        >
          This Month
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'end',
        }}
      >
        <div>
          <label
            htmlFor="report-start-date"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            Start Date
          </label>

          <input
            id="report-start-date"
            type="date"
            value={startDate}
            onChange={(event) =>
              updateDateRange(
                event.target.value,
                endDate
              )
            }
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="report-end-date"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            End Date
          </label>

          <input
            id="report-end-date"
            type="date"
            value={endDate}
            onChange={(event) =>
              updateDateRange(
                startDate,
                event.target.value
              )
            }
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
            }}
          />
        </div>
      </div>
    </div>
  )
}

const quickButtonStyle = {
  padding: '10px 16px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  background: '#f8fafc',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}