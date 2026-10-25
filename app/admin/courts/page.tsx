
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import CourtEdit from './CourtEdit'
import CourtStatusToggle from './CourtStatusToggle'
import AddCourt from './AddCourt'

export default async function AdminCourtsPage() {
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

  const { data: courts, error } = await supabase
    .from('courts')
    .select(
      'id, name, description, price_per_hour, status, created_at'
    )
    .order('name', { ascending: true })

  if (error) {
    console.error('Admin courts error:', error)
  }

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
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '32px',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '32px',
                  fontWeight: 700,
                }}
              >
                Court Management
              </h1>

              <AddCourt />

              <p
                style={{
                  marginTop: '8px',
                  color: '#666',
                }}
              >
                Manage your pickleball courts.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '16px',
            }}
          >
            {(courts ?? []).map((court) => (
              <div
                key={court.id}
                style={{
                  background: 'white',
                  color: '#1f2937',
                  borderRadius: '12px',
                  padding: '22px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '20px',
                      }}
                    >
                      {court.name}
                    </h2>

                    <p
                      style={{
                        marginTop: '8px',
                        color: '#666',
                      }}
                    >
                      {court.description || 'No description'}
                    </p>
                  </div>

                  <span
                    style={{
                      padding: '6px 10px',
                      borderRadius: '999px',
                      background:
                        court.status === 'available'
                          ? '#dcfce7'
                          : '#fee2e2',
                      color:
                        court.status === 'available'
                          ? '#166534'
                          : '#991b1b',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    {court.status === 'available'
                      ? 'Available'
                      : court.status === 'maintenance'
                        ? 'Maintenance'
                        : 'Inactive'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '40px',
                    flexWrap: 'wrap',
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid #eee',
                  }}
                >
                  <CourtEdit
                    court={{
                      id: court.id,
                      name: court.name,
                      description: court.description,
                      price_per_hour: court.price_per_hour,
                      status: court.status,
                    }}
                  />

                  <CourtStatusToggle
                    courtId={court.id}
                    status={court.status}
                  />

                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#777',
                        marginBottom: '4px',
                      }}
                    >
                      Price per hour
                    </div>

                    <strong>
                      ₱
                      {Number(
                        court.price_per_hour || 0
                      ).toLocaleString()}
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#777',
                        marginBottom: '4px',
                      }}
                    >
                      Court ID
                    </div>

                    <span
                      style={{
                        fontSize: '12px',
                        color: '#555',
                      }}
                    >
                      {court.id}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {(!courts || courts.length === 0) && (
              <div
                style={{
                  background: 'white',
                  color: '#1f2937',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center',
                }}
              >
                No courts found.
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
