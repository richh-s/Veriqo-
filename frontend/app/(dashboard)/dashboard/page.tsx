'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, GitBranch, Activity, CheckCircle, XCircle, Bell } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { instanceStatusConfig, stepTypeConfig, formatDate } from '@/lib/utils'
import type { AnalyticsOverview } from '@/types'

export default function DashboardPage() {
  const [data, setData]     = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    api.analytics.overview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const stats = data?.stats
  const statCards = stats ? [
    { label: 'Applicants',       value: stats.total_applicants,    icon: Users,       href: '/applicants',   color: 'text-blue-500' },
    { label: 'Workflows',        value: stats.total_workflows,     icon: GitBranch,   href: '/workflows',    color: 'text-violet-500' },
    { label: 'Active Checks',    value: stats.active_instances,    icon: Activity,    href: '/instances',    color: 'text-amber-500' },
    { label: 'Completed',        value: stats.completed_instances, icon: CheckCircle, href: '/instances',    color: 'text-green-500' },
    { label: 'Failed',           value: stats.failed_instances,    icon: XCircle,     href: '/instances',    color: 'text-red-500' },
    { label: 'Unread Alerts',    value: stats.pending_notifications, icon: Bell,      href: '/notifications', color: 'text-gray-400' },
  ] : []

  return (
    <div className="flex flex-col">
      <Navbar title="Dashboard" />

      <main className="flex-1 p-6 space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5"><div className="h-12 animate-pulse bg-gray-100 rounded" /></CardContent></Card>
              ))
            : statCards.map(({ label, value, icon: Icon, href, color }) => (
                <Link href={href} key={label}>
                  <Card className="hover:border-gray-300 transition-colors cursor-pointer">
                    <CardContent className="p-5 flex items-start justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{label}</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
                      </div>
                      <Icon className={`h-6 w-6 mt-0.5 ${color}`} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Step completion rates */}
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Step Completion Rates</h2>
            </div>
            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !data?.step_completion_rates?.length ? (
              <CardContent className="py-8 text-center text-sm text-gray-400">No step data yet.</CardContent>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.step_completion_rates.map((r) => (
                  <div key={r.step_name} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-700 font-medium truncate max-w-[160px]">{r.step_name}</span>
                      <span className="text-sm font-semibold text-gray-900">{r.completion_rate}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${r.completion_rate}%` }}
                      />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="text-green-600">{r.completed} done</span>
                      <span className="text-gray-400">{r.skipped} skipped</span>
                      <span className="text-red-500">{r.failed} failed</span>
                      <span className="ml-auto">{r.total} total</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 30-day trend */}
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">30-Day Activity</h2>
              <Link href="/instances" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="px-5 py-4 h-[120px] flex items-end gap-1">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-gray-50 rounded-sm animate-pulse" style={{ height: `${Math.random() * 60 + 20}%` }} />
                ))}
              </div>
            ) : !data?.instance_trend?.some((t) => t.created > 0 || t.completed > 0) ? (
              <CardContent className="py-8 text-center text-sm text-gray-400">No activity yet.</CardContent>
            ) : (
              <div className="px-5 py-4">
                <div className="flex items-end gap-0.5 h-24">
                  {data.instance_trend.slice(-14).map((day) => {
                    const maxVal = Math.max(...data.instance_trend.map((d) => Math.max(d.created, d.completed)), 1)
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}<br />
                          Started: {day.created} · Done: {day.completed}
                        </div>
                        <div className="w-full flex flex-col justify-end gap-px" style={{ height: '88px' }}>
                          <div className="w-full rounded-sm bg-blue-200" style={{ height: `${(day.created / maxVal) * 80}px` }} />
                          <div className="w-full rounded-sm bg-green-400" style={{ height: `${(day.completed / maxVal) * 80}px` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-200 inline-block" />Started</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-400 inline-block" />Completed</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
