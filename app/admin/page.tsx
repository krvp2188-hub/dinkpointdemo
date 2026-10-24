import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AdminNav from './AdminNav'

export default async function AdminPage() {
  const supabase = await createClient()

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
      customer_id,
      booking_date,
      start_time,
      end_time,
      amount,
      status,
      payment_status,
      payment_reference,
      created_at,
      court_id
    `)
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Admin bookings error:', error)
  }

  const allBookings = bookings ?? []
  
const { data: courts, error: courtsError } = await supabase
  .from('courts')
  .select('id, name, status')
  .order('name', { ascending: true })

if (courtsError) {
  console.error('Admin courts error:', courtsError)
}

const allCourts = courts ?? []

  const today = new Date().toISOString().split('T')[0]

  const todaysBookings = allBookings.filter(
    (booking) => booking.booking_date === today
  )

  const upcomingBookings = allBookings.filter(
    (booking) =>
      booking.booking_date > today &&
      booking.status !== 'cancelled'
  )

const pendingBookings = allBookings.filter(
  (booking) =>
    booking.status === 'pending'
)

const unpaidBookings = allBookings.filter(
  (booking) =>
    booking.payment_status === 'unpaid' &&
    booking.status !== 'cancelled'
)

const todaysRevenue = todaysBookings
  .filter((booking) => booking.status !== 'cancelled')
  .reduce(
    (total, booking) => total + Number(booking.amount || 0),
    0
  )

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
              Admin Dashboard
            </h1>

            <p
              style={{
                marginTop: '8px',
                color: '#666',
              }}
            >
              Manage your pickleball bookings and payments.
            </p>
          </div>

          <Link
            href="/book"
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              background: '#111827',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            View Booking Page
          </Link>
        </div>

 <div
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  }}
>
  <DashboardCard
    title="Today's Bookings"
    value={todaysBookings.length}
  />

  <DashboardCard
    title="Today's Revenue"
    value={`₱${todaysRevenue.toLocaleString()}`}
  />

  <DashboardCard
    title="Pending Bookings"
    value={pendingBookings.length}
  />

  <DashboardCard
    title="Unpaid Bookings"
    value={unpaidBookings.length}
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
            Today's Upcoming Bookings
          </h2>

          {todaysBookings.filter(
            (booking) => booking.status !== 'cancelled'
          ).length === 0 ? (
            <p style={{ color: '#666' }}>
              No bookings scheduled for today.
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
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Reference</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Payment</th>
                  </tr>
                </thead>

                <tbody>
                  {todaysBookings
                    .filter(
                      (booking) =>
                        booking.status !== 'cancelled'
                    )
                    .sort((a, b) =>
                      a.start_time.localeCompare(b.start_time)
                    )
                    .map((booking) => (
                      <tr key={booking.id}>
                        <td style={tdStyle}>
                          {booking.start_time} – {booking.end_time}
                        </td>

                        <td style={tdStyle}>
                          {booking.booking_reference}
                        </td>

                        <td style={tdStyle}>
                          ₱{Number(booking.amount).toLocaleString()}
                        </td>

                        <td style={tdStyle}>
                          {booking.status}
                        </td>

                        <td style={tdStyle}>
                          {booking.payment_status}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
		
        <section
          style={{
            background: 'white',
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
            Court Availability
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            {allCourts.map((court) => {
              const isMaintenance =
                court.status === 'maintenance'

              const isInactive =
                court.status === 'inactive'

              const isBookedToday = allBookings.some(
                (booking) =>
                  booking.court_id === court.id &&
                  booking.booking_date === today &&
                  booking.status !== 'cancelled'
              )

              let background = '#ecfdf5'
              let border = '#bbf7d0'
              let color = '#166534'
              let label = 'Available'

              if (isMaintenance) {
                background = '#fef3c7'
                border = '#fde68a'
                color = '#92400e'
                label = 'Maintenance'
              } else if (isInactive) {
                background = '#f3f4f6'
                border = '#d1d5db'
                color = '#4b5563'
                label = 'Inactive'
              } else if (isBookedToday) {
                background = '#fee2e2'
                border = '#fecaca'
                color = '#991b1b'
                label = 'Booked Today'
              }

              return (
                <div
                  key={court.id}
                  style={{
                    background,
                    border: `1px solid ${border}`,
                    borderRadius: '10px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: '6px',
                    }}
                  >
                    {court.name}
                  </div>

                  <div
                    style={{
                      color,
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {label}
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
              marginBottom: '20px',
            }}
          >
            Recent Bookings
          </h2>

          {allBookings.length === 0 ? (
            <p style={{ color: '#666' }}>
              No bookings yet.
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
                    <th style={thStyle}>Reference</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Payment</th>
                  </tr>
                </thead>

                <tbody>
                  {allBookings.slice(0, 20).map((booking) => (
                    <tr key={booking.id}>
                      <td style={tdStyle}>
                        {booking.booking_reference}
                      </td>

                      <td style={tdStyle}>
                        {booking.booking_date}
                      </td>

                      <td style={tdStyle}>
                        {booking.start_time} – {booking.end_time}
                      </td>

                      <td style={tdStyle}>
                        ₱{Number(booking.amount).toLocaleString()}
                      </td>

                      <td style={tdStyle}>
                        {booking.status}
                      </td>

                      <td style={tdStyle}>
                        {booking.payment_status}
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

function DashboardCard({
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
  borderBottom: '1px solid #eee',
  fontSize: '14px',
}

const tdStyle = {
  padding: '14px 12px',
  borderBottom: '1px solid #eee',
  fontSize: '14px',
}