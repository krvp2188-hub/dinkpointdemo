import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditOperatingHours from './EditOperatingHours'
import DateSpecificOperatingHours from './DateSpecificOperatingHours'
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

  const { data: dateOverrides, error: overridesError } = await supabase
    .from('operating_hours_overrides')
    .select('*')
    .order('start_date', { ascending: true })

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
        padding: 0,
        color: '#0f172a',
        background: '#f8fafc',
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'clamp(16px, 3vw, 30px)', boxSizing: 'border-box' }}>
      <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0f766e' }}>DINKPOINT PANABO · ADMIN</p>
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: '#020617',
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

      <DateSpecificOperatingHours
        initialOverrides={dateOverrides || []}
        loadError={overridesError?.message || ''}
      />

      <h2 style={{ margin: '30px 0 12px', fontSize: '21px', fontWeight: 700 }}>
        Regular Weekly Schedule
      </h2>

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
              color: '#0f172a',
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
      </div>
    </main>
	</>
  )
}