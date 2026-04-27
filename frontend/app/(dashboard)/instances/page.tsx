'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { api } from '@/lib/api'
import { instanceStatusConfig, formatDate } from '@/lib/utils'
import type { WorkflowInstance, Applicant, Workflow } from '@/types'

export default function InstancesPage() {
  const [instances, setInstances]   = useState<WorkflowInstance[]>([])
  const [applicants, setApplicants] = useState<Record<string, Applicant>>({})
  const [workflows, setWorkflows]   = useState<Record<string, Workflow>>({})
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      const [insts, apps, wfs] = await Promise.all([
        api.instances.list(),
        api.applicants.list(),
        api.workflows.list(),
      ])
      setInstances(insts)
      setApplicants(Object.fromEntries(apps.map((a) => [a.id, a])))
      setWorkflows(Object.fromEntries(wfs.map((w) => [w.id, w])))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="flex flex-col">
      <Navbar title="Instances" />

      <main className="flex-1 p-6 space-y-4">
        <p className="text-sm text-gray-500">{instances.length} instance{instances.length !== 1 ? 's' : ''}</p>

        <Card>
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No workflow instances yet.</p>
              <p className="text-xs text-gray-400 mt-1">Start one from a workflow page.</p>
            </div>
          ) : (
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
                {instances.map((inst) => {
                  const app = applicants[inst.applicant_id]
                  const wf  = workflows[inst.workflow_id]
                  const cfg = instanceStatusConfig[inst.status]
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
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{done}/{total}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge className={cfg.className}>{cfg.label}</Badge></TableCell>
                      <TableCell>{formatDate(inst.created_at)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  )
}
