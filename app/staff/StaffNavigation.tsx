'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/staff', label: 'Bookings & GCash Receipts' },
  { href: '/staff/confirmation-email-status', label: 'Confirmation Email Status' },
]

export default function StaffNavigation() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav aria-label="Staff navigation" className="sticky top-0 z-40 border-b border-teal-900/20 bg-teal-950 text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
        <Link href="/staff" className="flex min-w-0 items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-lg font-black text-lime-200">D</span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-extrabold tracking-wide sm:text-base">DINKPOINT</span>
            <span className="block text-[10px] font-bold tracking-[0.2em] text-lime-300 sm:text-xs">PANABO · STAFF</span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const active = link.href === '/staff'
              ? pathname === '/staff'
              : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? 'bg-teal-800 text-white shadow-inner' : 'text-teal-50 hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
          <Link href="/book" className="ml-2 rounded-xl border border-white/30 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Booking Page ↗
          </Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? 'Close staff navigation menu' : 'Open staff navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="staff-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10 md:hidden"
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div id="staff-mobile-menu" className="border-t border-white/10 px-3 pb-3 pt-2 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => {
              const active = link.href === '/staff'
                ? pathname === '/staff'
                : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                    active ? 'bg-teal-800 text-white' : 'text-teal-50 hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <Link href="/book" onClick={() => setMenuOpen(false)} className="rounded-xl border border-white/20 px-3 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Booking Page ↗
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
