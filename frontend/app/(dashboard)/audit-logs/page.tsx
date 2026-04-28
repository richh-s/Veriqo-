'use client'

import { useEffect, useState, useCallback } from 'react'
import { ScrollText } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog, AuditAction, PaginatedResponse } from '@/types'

const ACTION_LABELS: Record<AuditAction, string> = {
  user_registered:      'User Registered',
  user_logged_in:       'User Login',
  user_invited:         'User Invited',
  applicant_created:    'Applicant Created',
  applicant_updated:    'Applicant Updated',
  applicant_deleted:    'Applicant Deleted',
  workflow_created:     'Workflow Created',
  workflow_updated:     'Workflow Updated',
  workflow_deleted:     'Workflow Deleted',
  instance_created:     'Check Started',
  step_advanced:        'Step Advanced',
  instance_completed:   'Check Completed',
  communication_logged: 'Communication Logged',
  tenant_disabled:      'Tenant Disabled',
  tenant_enabled:       'Tenant Enabled',
  tenant_created:       'Tenant Created',
  superadmin_login:     'Superadmin Login',
}

const ACTION_COLORS: Record<string, string> = {
  user_registered: 'bg-green-50 text-green-700 border-green-200',
  user_logged_in:  'bg-gray-50 text-gray-600 border-gray-200',
  user_invited:    'bg-blue-50 text-blue-700 border-blue-200',
  applicant_created: 'bg-blue-50 text-blue-700 border-blue-200',
  applicant_updated: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  applicant_deleted: 'bg-red-50 text-red-700 border-red-200',
  workflow_created:  'bg-violet-50 text-violet-700 border-violet-200',
  workflow_updated:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  workflow_deleted:  'bg-red-50 text-red-700 border-red-200',
  instance_created:  'bg-blue-50 text-blue-700 border-blue-200',
  step_advanced:     'bg-gray-50 text-gray-600 border-gray-200',
  instance_completed:'bg-green-50 text-green-700 border-green-200',
  communication_logged: 'bg-teal-50 text-teal-700 border-teal-200',
  tenant_disabled:   'bg-red-50 text-red-700 border-red-200',
  tenant_enabled:    'bg-green-50 text-green-700 border-green-200',
}

export default function AuditLogsPage() {
  const [result, setResult]   = useState<PaginatedResponse<AuditLog> | null>(null)
  const [page, setPage]       = useState(1)
  const [action, setAction]   = useState<AuditAction | ''>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.auditLogs.list({
        page,
        per_page: 25,
        action: action || undefined,
      })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }, [page, action])

  useEffect(() => { load() }, [load])

  const allActions = Object.keys(ACTION_LABELS) as AuditAction[]

  return (
    <div className="flex flex-col">
      <Navbar title="Audit Logs" />

      <main className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value as AuditAction | ''); setPage(1) }}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All actions</option>
            {allActions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
          {result && (
            <span className="text-sm text-gray-500">{result.total} entries</span>
          )}
        </div>

        <Card>
          {loading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                  <div className="h-5 w-32 rounded-full bg-gray-100" />
                  <div className="h-4 w-40 rounded bg-gray-100" />
                  <div className="h-4 w-20 rounded bg-gray-100" />
                  <div className="h-4 w-28 rounded bg-gray-100 ml-auto" />
                </div>
              ))}
            </div>
          ) : !result?.items.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ScrollText className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No audit log entries yet.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className={ACTION_COLORS[log.action] ?? 'bg-gray-50 text-gray-600 border-gray-200'}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {log.entity_type ? (
                          <span className="capitalize">{log.entity_type.replace('_', ' ')}</span>
                        ) : '—'}
                        {log.entity_id && (
                          <span className="ml-1 text-xs text-gray-400 font-mono">
                            {log.entity_id.slice(0, 8)}…
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm font-mono text-xs">
                        {log.user_id ? log.user_id.slice(0, 8) + '…' : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
