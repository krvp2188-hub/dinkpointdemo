import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditOperatingHours from './EditOperatingHours'
import AdminNav from '@/app/admin/AdminNav'

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export default async function OperatingHoursPage() {
  

  
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

  const { data: hours, error } = await supabase
    .from('operating_hours')
    .select('*')
    .order('day_of_week')

  if (error) {
    return (
      <main style={{ padding: '30px' }}>
        <h1>Operating Hours</h1>
        <p>Unable to load operating hours.</p>
      </main>
    )
  }

  return (
  <>
    <AdminNav />
    <main
      style={{
        padding: '30px',
        color: '#1f2937',
        background: '#f5f7fb',
        minHeight: '100vh',
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '30px',
          fontWeight: 700,
        }}
      >
        Operating Hours
      </h1>

      <p
        style={{
          margin: '0 0 25px',
          color: '#6b7280',
        }}
      >
        Manage the days and hours when customers can book the courts.
      </p>

      <div
        style={{
          display: 'grid',
          gap: '12px',
        }}
      >
        {(hours || []).map((hour) => (
          <div
            key={hour.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 120px',
              alignItems: 'center',
              gap: '15px',
              padding: '18px',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              background: '#ffffff',
            }}
          >
            <div>
              <strong>{dayNames[hour.day_of_week]}</strong>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '3px',
                }}
              >
                Opens
              </div>

              <strong>{hour.open_time}</strong>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '3px',
                }}
              >
                Closes
              </div>

              <strong>{hour.close_time}</strong>
            </div>

            <div
              style={{
                padding: '7px 10px',
                borderRadius: '20px',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: 600,
                background: hour.is_open ? '#dcfce7' : '#fee2e2',
                color: hour.is_open ? '#166534' : '#991b1b',
              }}
            >
              {hour.is_open ? 'Open' : 'Closed'}
            </div>
			
			<EditOperatingHours
			  id={hour.id}
			  openTime={hour.open_time}
			  closeTime={hour.close_time}
			  isOpen={hour.is_open}
			/>
          </div>
        ))}
      </div>
    </main>
	</>
  )
}