'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Activity, SlidersHorizontal, Download } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { api } from '@/lib/api'
import { instanceStatusConfig, formatDate } from '@/lib/utils'
import type { WorkflowInstance, Applicant, Workflow, InstanceStatus, PaginatedResponse } from '@/types'

const STATUS_OPTIONS: { value: InstanceStatus | ''; label: string }[] = [
  { value: '',            label: 'All statuses' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'failed',      label: 'Failed' },
  { value: 'pending',     label: 'Pending' },
]

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
          <div className="h-4 w-36 rounded bg-gray-100" />
          <div className="h-4 w-28 rounded bg-gray-100" />
          <div className="h-2 w-20 rounded-full bg-gray-100" />
          <div className="h-5 w-20 rounded-full bg-gray-100 ml-auto" />
          <div className="h-4 w-20 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export default function InstancesPage() {
  const [result, setResult]         = useState<PaginatedResponse<WorkflowInstance> | null>(null)
  const [applicants, setApplicants] = useState<Record<string, Applicant>>({})
  const [workflows, setWorkflows]   = useState<Record<string, Workflow>>({})
  const [page, setPage]             = useState(1)
  const [status, setStatus]         = useState<InstanceStatus | ''>('')
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [insts, apps, wfs] = await Promise.all([
        api.instances.list({ page, per_page: 20, status: status || undefined }),
        api.applicants.list({ per_page: 100 }),
        api.workflows.list(),
      ])
      setResult(insts)
      setApplicants(Object.fromEntries(apps.items.map((a) => [a.id, a])))
      setWorkflows(Object.fromEntries(wfs.map((w) => [w.id, w])))
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { load() }, [load])

  function exportCSV() {
    const rows = result?.items ?? []
    if (!rows.length) return
    const headers = ['Applicant', 'Email', 'Workflow', 'Status', 'Progress', 'Started']
    const lines = rows.map((inst) => {
      const app  = applicants[inst.applicant_id]
      const wf   = workflows[inst.workflow_id]
      const done  = inst.step_instances.filter((s) => ['completed', 'skipped'].includes(s.status)).length
      const total = inst.step_instances.length
      return [
        app ? `${app.first_name} ${app.last_name}` : inst.applicant_id,
        app?.email ?? '',
        wf?.name ?? inst.workflow_id,
        inst.status,
        `${done}/${total}`,
        new Date(inst.created_at).toLocaleDateString(),
      ]
    })
    const csv  = [headers, ...lines].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `instances-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col">
      <Navbar title="Instances" />

      <main className="flex-1 p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <SlidersHorizontal className="h-4 w-4" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as InstanceStatus | ''); setPage(1) }}
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {result && (
              <span className="text-sm text-gray-500">
                {result.total} instance{result.total !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={!result?.items.length}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card>
          {loading ? (
            <TableSkeleton />
          ) : !result?.items.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-700">No workflow instances yet</p>
              <p className="text-xs text-gray-400 mt-1">
                {status ? 'Try clearing the status filter.' : 'Start a workflow from any applicant or workflow page.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.items.map((inst) => {
                      const app   = applicants[inst.applicant_id]
                      const wf    = workflows[inst.workflow_id]
                      const cfg   = instanceStatusConfig[inst.status]
                      const done  = inst.step_instances.filter((s) => ['completed', 'skipped'].includes(s.status)).length
                      const total = inst.step_instances.length
                      return (
                        <TableRow key={inst.id} className="cursor-pointer">
                          <TableCell>
                            <Link href={`/instances/${inst.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                              {app ? `${app.first_name} ${app.last_name}` : <span className="text-gray-400">—</span>}
                            </Link>
                          </TableCell>
                          <TableCell className="text-gray-600">{wf?.name ?? <span className="text-gray-400">—</span>}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
                              </div>
                              <span className="text-xs text-gray-500">{done}/{total}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge className={cfg.className}>{cfg.label}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(inst.created_at)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
