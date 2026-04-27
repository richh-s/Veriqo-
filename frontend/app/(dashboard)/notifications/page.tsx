'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { api } from '@/lib/api'
import { cn, formatDateTime } from '@/lib/utils'
import type { Notification, PaginatedResponse } from '@/types'

export default function NotificationsPage() {
  const [result, setResult]       = useState<PaginatedResponse<Notification> | null>(null)
  const [page, setPage]           = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [marking, setMarking]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.notifications.list({ page, per_page: 20, unread_only: unreadOnly })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }, [page, unreadOnly])

  useEffect(() => { load() }, [load])

  async function handleMarkAll() {
    setMarking(true)
    try {
      await api.notifications.markAllRead()
      await load()
    } finally {
      setMarking(false)
    }
  }

  async function handleMarkOne(id: string) {
    await api.notifications.markRead([id])
    setResult((prev) =>
      prev ? { ...prev, items: prev.items.map((n) => n.id === id ? { ...n, is_read: true } : n) } : prev
    )
  }

  const unreadCount = result?.items.filter((n) => !n.is_read).length ?? 0

  return (
    <div className="flex flex-col">
      <Navbar title="Notifications" />

      <main className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1) }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Unread only
            </label>
          </div>
          <div className="flex items-center gap-3">
            {result && <span className="text-sm text-gray-500">{result.total} notification{result.total !== 1 ? 's' : ''}</span>}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAll}
                disabled={marking}
                className="gap-1.5"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <Card>
          {loading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-100" />
                    <div className="h-3 w-24 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : !result?.items.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No notifications yet.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {result.items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start justify-between gap-4 px-5 py-4 transition-colors',
                      !n.is_read ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm leading-snug', !n.is_read ? 'font-medium text-gray-900' : 'text-gray-700')}>
                        {n.message}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">{formatDateTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkOne(n.id)}
                        className="shrink-0 text-xs text-blue-600 hover:underline mt-0.5"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {result.pages > 1 && (
                <div className="px-4 border-t border-gray-100">
                  <Pagination
                    page={result.page}
                    pages={result.pages}
                    total={result.total}
                    per_page={result.per_page}
                    onPage={(p) => setPage(p)}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
