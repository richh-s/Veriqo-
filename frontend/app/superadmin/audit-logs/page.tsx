'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, LogIn, Building2, PowerOff, Power, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AuditLog, PaginatedResponse } from '@/types'

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  tenant_created:    { label: 'Tenant Created',    icon: Plus,       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  tenant_enabled:    { label: 'Tenant Activated',  icon: Power,      color: 'bg-green-50 text-green-700 border-green-200' },
  tenant_disabled:   { label: 'Tenant Deactivated',icon: PowerOff,   color: 'bg-red-50 text-red-700 border-red-200' },
  superadmin_login:  { label: 'Superadmin Login',  icon: LogIn,      color: 'bg-gray-50 text-gray-600 border-gray-200' },
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatExact(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getDetail(log: AuditLog): string {
  const m = log.metadata_ as Record<string, string> | null
  if (!m) return '—'
  if (log.action === 'tenant_created') return `${m.tenant_name} · admin: ${m.admin_email}`
  if (log.action === 'superadmin_login') return m.email ?? '—'
  if (log.action === 'tenant_enabled' || log.action === 'tenant_disabled') {
    return m.tenant_name ? m.tenant_name : `Tenant ${log.entity_id?.slice(0, 8) ?? ''}`
  }
  return '—'
}

export default function SuperAdminAuditPage() {
  const [result, setResult] = useState<PaginatedResponse<AuditLog> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.superadmin.listAuditLogs({ page, per_page: 30 })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Audit Log</h2>
        <p className="text-sm text-gray-500 mt-1">A permanent record of all platform-level actions.</p>
      </div>

      <Card className="overflow-hidden border-gray-200 shadow-sm">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Loading activity...</p>
          </div>
        ) : !result?.items.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-base font-medium text-gray-900">No activity yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mt-1">Platform actions will appear here as they happen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="py-4 w-[220px]">Action</TableHead>
                  <TableHead className="py-4">Details</TableHead>
                  <TableHead className="py-4 text-right pr-8">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((log) => {
                  const cfg = ACTION_CONFIG[log.action] ?? {
                    label: log.action,
                    icon: ClipboardList,
                    color: 'bg-gray-50 text-gray-600 border-gray-200',
                  }
                  const Icon = cfg.icon
                  return (
                    <TableRow key={log.id} className="hover:bg-gray-50/50 transition-colors border-gray-100">
                      <TableCell className="py-4">
                        <Badge className={cn('gap-1.5 font-medium', cfg.color)}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-600">
                        {getDetail(log)}
                      </TableCell>
                      <TableCell className="py-4 text-right pr-8">
                        <span className="text-xs text-gray-500" title={formatExact(log.created_at)}>
                          {formatRelative(log.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {result.pages > 1 && (
              <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100">
                <Pagination
                  page={result.page}
                  pages={result.pages}
                  total={result.total}
                  per_page={result.per_page}
                  onPage={(p) => setPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
