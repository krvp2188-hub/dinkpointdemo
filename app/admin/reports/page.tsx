import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ReportFilters from './ReportFilters'
import ReportCharts from './ReportCharts'
import AdminNav from '../AdminNav'

type ReportsPageProps = {
  searchParams: Promise<{
    start?: string
    end?: string
  }>
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const supabase = await createClient()
  
const params = await searchParams

const today = new Date()
const todayString = today.toISOString().split('T')[0]

const defaultStartDate = new Date(today)
defaultStartDate.setDate(today.getDate() - 6)

const defaultStartString = defaultStartDate
  .toISOString()
  .split('T')[0]

const startDate = params.start || defaultStartString
const endDate = params.end || todayString
  

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_reference,
      booking_date,
      start_time,
      end_time,
      amount,
      status,
      payment_status,
      court_id
    `)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Reports bookings error:', error)
  }

  const allBookings = bookings ?? []

const reportBookings = allBookings.filter(
  (booking) =>
    booking.booking_date >= startDate &&
    booking.booking_date <= endDate
)

  const confirmedBookings = reportBookings.filter(
    (booking) => booking.status === 'confirmed'
  )

  const pendingBookings = reportBookings.filter(
    (booking) => booking.status === 'pending'
  )

  const cancelledBookings = reportBookings.filter(
    (booking) => booking.status === 'cancelled'
  )

  const totalRevenue = confirmedBookings.reduce(
    (total, booking) =>
      total + Number(booking.amount || 0),
    0
  )

  const paidRevenue = confirmedBookings
    .filter((booking) => booking.payment_status === 'paid')
    .reduce(
      (total, booking) =>
        total + Number(booking.amount || 0),
      0
    )

  const unpaidRevenue = confirmedBookings
    .filter((booking) => booking.payment_status === 'unpaid')
    .reduce(
      (total, booking) =>
        total + Number(booking.amount || 0),
      0
    )

const reportStart = new Date(`${startDate}T00:00:00`)
const reportEnd = new Date(`${endDate}T00:00:00`)

const dayCount =
  Math.floor(
    (reportEnd.getTime() - reportStart.getTime()) /
      (1000 * 60 * 60 * 24)
  ) + 1

const dailyReport = Array.from(
  { length: Math.max(dayCount, 0) },
  (_, index) => {
    const date = new Date(reportStart)

    date.setDate(
      reportStart.getDate() + index
    )

    const dateString = date
      .toISOString()
      .split('T')[0]

    const dayBookings = reportBookings.filter(
      (booking) =>
        booking.booking_date === dateString
    )

    const dayConfirmedBookings =
      dayBookings.filter(
        (booking) =>
          booking.status === 'confirmed'
      )

    const dayRevenue =
      dayConfirmedBookings.reduce(
        (total, booking) =>
          total + Number(booking.amount || 0),
        0
      )

    return {
      date: dateString,
      bookings: dayBookings.length,
      confirmed: dayConfirmedBookings.length,
      revenue: dayRevenue,
    }
  }
)

  const { data: courts } = await supabase
    .from('courts')
    .select('id, name')
    .order('name', { ascending: true })

  const courtReport = (courts ?? []).map((court) => {
    const courtBookings = reportBookings.filter(
      (booking) =>
        booking.court_id === court.id &&
        booking.status !== 'cancelled'
    )

    const courtRevenue = courtBookings
      .filter((booking) => booking.status === 'confirmed')
      .reduce(
        (total, booking) =>
          total + Number(booking.amount || 0),
        0
      )

    return {
      name: court.name,
      bookings: courtBookings.length,
      revenue: courtRevenue,
    }
  })

  return (
    <>
    <AdminNav />
  
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        color: '#1f2937',
        padding: '32px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            gap: '16px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Reports & Analytics
            </h1>

            <p
              style={{
                marginTop: '8px',
                color: '#666',
              }}
            >
              Booking and revenue performance for the last 7 days.
            </p>
          </div>

          <Link
            href="/admin"
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              background: '#111827',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            Back to Dashboard
          </Link>
        </div>

<ReportFilters
  startDate={startDate}
  endDate={endDate}
/>

<ReportCharts dailyReport={dailyReport} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <ReportCard
            title="Total Bookings"
            value={reportBookings.length}
          />

          <ReportCard
            title="Confirmed"
            value={confirmedBookings.length}
          />

          <ReportCard
            title="Pending"
            value={pendingBookings.length}
          />

          <ReportCard
            title="Cancelled"
            value={cancelledBookings.length}
          />

          <ReportCard
            title="Total Revenue"
            value={`₱${totalRevenue.toLocaleString()}`}
          />

          <ReportCard
            title="Paid Revenue"
            value={`₱${paidRevenue.toLocaleString()}`}
          />

          <ReportCard
            title="Unpaid Revenue"
            value={`₱${unpaidRevenue.toLocaleString()}`}
          />
        </div>

        <section
          style={{
            background: 'white',
            color: '#1f2937',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: '20px',
            }}
          >
            Daily Performance
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Bookings</th>
                  <th style={thStyle}>Confirmed</th>
                  <th style={thStyle}>Revenue</th>
                </tr>
              </thead>

              <tbody>
                {dailyReport.map((day) => (
                  <tr key={day.date}>
                    <td style={tdStyle}>
                      {day.date}
                    </td>

                    <td style={tdStyle}>
                      {day.bookings}
                    </td>

                    <td style={tdStyle}>
                      {day.confirmed}
                    </td>

                    <td style={tdStyle}>
                      ₱{day.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          style={{
            background: 'white',
            color: '#1f2937',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: '20px',
            }}
          >
            Court Performance
          </h2>

          {courtReport.length === 0 ? (
            <p style={{ color: '#666' }}>
              No courts found.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Court</th>
                    <th style={thStyle}>Bookings</th>
                    <th style={thStyle}>Revenue</th>
                  </tr>
                </thead>

                <tbody>
                  {courtReport.map((court) => (
                    <tr key={court.name}>
                      <td style={tdStyle}>
                        {court.name}
                      </td>

                      <td style={tdStyle}>
                        {court.bookings}
                      </td>

                      <td style={tdStyle}>
                        ₱{court.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
	</>
  )
}

function ReportCard({
  title,
  value,
}: {
  title: string
  value: string | number
}) {
  return (
    <div
      style={{
        background: 'white',
        color: '#1f2937',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          color: '#666',
          fontSize: '14px',
          marginBottom: '8px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '28px',
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left' as const,
  padding: '12px',
  borderBottom: '1px solid #e5e7eb',
  color: '#334155',
  fontSize: '14px',
}

const tdStyle = {
  padding: '14px 12px',
  borderBottom: '1px solid #e5e7eb',
  color: '#334155',
  fontSize: '14px',
}