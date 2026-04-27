'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, Menu } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth-store'
import { useSidebarStore } from '@/store/sidebar-store'
import { api } from '@/lib/api'
import { cn, formatDateTime } from '@/lib/utils'
import type { Notification } from '@/types'

interface NavbarProps {
  title: string
}

export function Navbar({ title }: NavbarProps) {
  const user         = useAuthStore((s) => s.user)
  const toggleSidebar = useSidebarStore((s) => s.toggle)

  const [unread, setUnread]               = useState(0)
  const [open, setOpen]                   = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(false)
  const dropdownRef                       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    api.notifications.unreadCount().then((r) => setUnread(r.unread_count)).catch(() => {})

    const interval = setInterval(() => {
      api.notifications.unreadCount().then((r) => setUnread(r.unread_count)).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const res = await api.notifications.list({ per_page: 10, unread_only: false })
      setNotifications(res.items)
      if (unread > 0) {
        await api.notifications.markAllRead()
        setUnread(0)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleSidebar}
          className="md:hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleOpen}
              className="relative rounded-full p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  <Link
                    href="/notifications"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    View all
                  </Link>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {loading ? (
                    <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
                  ) : notifications.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn('px-4 py-3', !n.is_read && 'bg-blue-50/50')}
                      >
                        <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                        <p className="mt-1 text-xs text-gray-400">{formatDateTime(n.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {user && (
          <span className="hidden sm:block text-sm text-gray-500 truncate max-w-[180px]">
            {user.email}
          </span>
        )}
      </div>
    </header>
  )
}
