'use client'

type DailyReport = {
  date: string
  bookings: number
  confirmed: number
  revenue: number
}

type Props = {
  dailyReport: DailyReport[]
}

export default function ReportCharts({
  dailyReport,
}: Props) {
  const maxBookings = Math.max(
    ...dailyReport.map((day) => day.bookings),
    1
  )

  const maxRevenue = Math.max(
    ...dailyReport.map((day) => day.revenue),
    1
  )

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '24px',
      }}
    >
      <section
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: '24px',
          }}
        >
          Bookings per Day
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'end',
            gap: '10px',
            height: '220px',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 8px',
          }}
        >
          {dailyReport.map((day) => {
            const height =
              (day.bookings / maxBookings) * 170

            return (
              <div
                key={day.date}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'end',
                  alignItems: 'center',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '6px',
                  }}
                >
                  {day.bookings}
                </div>

                <div
                  title={`${day.date}: ${day.bookings} bookings`}
                  style={{
                    width: '100%',
                    maxWidth: '42px',
                    height: `${Math.max(height, 4)}px`,
                    background: '#0f766e',
                    borderRadius: '6px 6px 0 0',
                  }}
                />

                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#666',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'top center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {day.date.slice(5)}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: '24px',
          }}
        >
          Revenue per Day
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'end',
            gap: '10px',
            height: '220px',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 8px',
          }}
        >
          {dailyReport.map((day) => {
            const height =
              (day.revenue / maxRevenue) * 170

            return (
              <div
                key={day.date}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'end',
                  alignItems: 'center',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ₱{day.revenue.toLocaleString()}
                </div>

                <div
                  title={`${day.date}: ₱${day.revenue.toLocaleString()}`}
                  style={{
                    width: '100%',
                    maxWidth: '42px',
                    height: `${Math.max(height, 4)}px`,
                    background: '#16a34a',
                    borderRadius: '6px 6px 0 0',
                  }}
                />

                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#666',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'top center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {day.date.slice(5)}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}