import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConfirmationEmailStatus from './ConfirmationEmailStatus'

export default async function ConfirmationEmailStatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['staff', 'admin'].includes(profile.role)) {
    redirect('/')
  }

  return <ConfirmationEmailStatus />
}
