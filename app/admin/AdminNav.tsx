'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/admin', label: 'Dashboard', icon: '🏠' },
  { href: '/admin/bookings', label: 'Bookings', icon: '📅' },
  { href: '/admin/reports', label: 'Reports', icon: '📊' },
  { href: '/admin/courts', label: 'Courts', icon: '🏓' },
  { href: '/admin/operating-hours', label: 'Operating Hours', icon: '🕒' },
]

type AdminNotification = {
  id: string
  event_type: string
  title: string
  message: string
  booking_reference: string | null
  created_at: string
}

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    const { data: notificationData, error } = await supabase
      .from('admin_notifications')
      .select('id, event_type, title, message, booking_reference, created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('Could not load admin notifications:', error)
      setLoading(false)
      return
    }

    const { data: readData, error: readError } = await supabase
      .from('admin_notification_reads')
      .select('notification_id')

    if (readError) {
      console.error('Could not load notification read status:', readError)
    }

    setNotifications(notificationData ?? [])
    setReadIds((readData ?? []).map((item) => item.notification_id))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadNotifications()
    const interval = window.setInterval(() => {
      void loadNotifications()
    }, 30000)
    return () => window.clearInterval(interval)
  }, [loadNotifications])

  async function markAsRead(notificationId: string) {
    if (readIds.includes(notificationId)) return

    // The reads table requires both the notification ID and the signed-in user's ID.
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Could not identify the signed-in user to mark notification as read:', userError)
      return
    }

    const { error } = await supabase
      .from('admin_notification_reads')
      .insert({
        notification_id: notificationId,
        user_id: user.id,
      })

    // A duplicate insert means it has already been marked read.
    if (error && error.code !== '23505') {
      console.error('Could not mark notification as read:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return
    }

    setReadIds((current) =>
      current.includes(notificationId) ? current : [...current, notificationId]
    )
  }

  async function handleLogout() {
    if (signingOut) return

    setSigningOut(true)
    setLogoutError('')

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Could not sign out:', error)
        setLogoutError('Logout failed. Please try again.')
        setSigningOut(false)
        return
      }

      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Unexpected error while signing out:', error)
      setLogoutError('Logout failed. Please try again.')
      setSigningOut(false)
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !readIds.includes(notification.id)
  ).length

  return (
    <nav
      style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: '64px',
          flexWrap: 'wrap',
          overflow: 'visible',
          color: '#1f2937',
        }}
      >
        {links.map((link) => {
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                fontSize: '14px',
                fontWeight: 600,
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#2563eb' : '#475569',
                flexShrink: 0,
              }}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}

        <div style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }}>
          <button
            type="button"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={isOpen}
            onClick={() => {
              const nextOpen = !isOpen
              setIsOpen(nextOpen)
              if (nextOpen) void loadNotifications()
            }}
            style={{
              position: 'relative',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              background: isOpen ? '#f8fafc' : 'white',
              color: '#1f2937',
              padding: '9px 12px',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-7px',
                  right: '-7px',
                  minWidth: '19px',
                  height: '19px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  background: '#dc2626',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                width: 'min(380px, calc(100vw - 32px))',
                maxHeight: '460px',
                overflowY: 'auto',
                background: 'white',
                color: '#1f2937',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <strong style={{ fontSize: '15px' }}>Notifications</strong>
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: '#2563eb',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Refresh
                </button>
              </div>

              {loading && notifications.length === 0 ? (
                <p style={{ padding: '18px', color: '#64748b', fontSize: '14px' }}>
                  Loading notifications…
                </p>
              ) : notifications.length === 0 ? (
                <p style={{ padding: '18px', color: '#64748b', fontSize: '14px' }}>
                  No notifications yet.
                </p>
              ) : (
                notifications.map((notification) => {
                  const isRead = readIds.includes(notification.id)
                  return (
                    <div
                      key={notification.id}
                      role={notification.booking_reference ? 'link' : undefined}
                      tabIndex={notification.booking_reference ? 0 : undefined}
                      onClick={() => {
                        if (!notification.booking_reference) return
                        void markAsRead(notification.id)
                        setIsOpen(false)
                        router.push(`/admin/bookings?booking=${encodeURIComponent(notification.booking_reference)}`)
                      }}
                      onKeyDown={(event) => {
                        if (notification.booking_reference && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault()
                          void markAsRead(notification.id)
                          setIsOpen(false)
                          router.push(`/admin/bookings?booking=${encodeURIComponent(notification.booking_reference)}`)
                        }
                      }}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        background: isRead ? 'white' : '#eff6ff',
                        cursor: notification.booking_reference ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span aria-hidden="true" style={{ fontSize: '18px' }}>
                          {notification.event_type === 'new_booking'
                            ? '📅'
                            : notification.event_type === 'payment_status_changed'
                              ? '💳'
                              : notification.event_type === 'booking_cancelled'
                                ? '❌'
                                : '🔔'}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                            {notification.title}
                          </p>
                          <p
                            style={{
                              margin: '5px 0 8px',
                              color: '#475569',
                              fontSize: '13px',
                              lineHeight: 1.45,
                            }}
                          >
                            {notification.message}
                          </p>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                              {new Date(notification.created_at).toLocaleString()}
                            </span>
                            {notification.booking_reference && (
                              <Link
                                href={`/admin/bookings?booking=${encodeURIComponent(notification.booking_reference)}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void markAsRead(notification.id)
                                  setIsOpen(false)
                                }}
                                style={{
                                  color: '#2563eb',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                View booking
                              </Link>
                            )}
                          </div>
                          {!isRead && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void markAsRead(notification.id)
                              }}
                              style={{
                                marginTop: '8px',
                                padding: 0,
                                border: 0,
                                background: 'transparent',
                                color: '#2563eb',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {logoutError && (
            <span
              role="alert"
              style={{
                color: '#b91c1c',
                fontSize: '12px',
                maxWidth: '180px',
              }}
            >
              {logoutError}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={signingOut}
            style={{
              border: '1px solid #fecaca',
              borderRadius: '10px',
              background: signingOut ? '#fef2f2' : 'white',
              color: '#b91c1c',
              padding: '10px 12px',
              cursor: signingOut ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              opacity: signingOut ? 0.7 : 1,
            }}
          >
            {signingOut ? 'Logging out…' : '🚪 Logout'}
          </button>
        </div>
      </div>
    </nav>
  )
}
