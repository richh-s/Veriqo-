'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, GitBranch, Activity, CheckCircle } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { instanceStatusConfig, formatDate } from '@/lib/utils'
import type { Applicant, Workflow, WorkflowInstance } from '@/types'

interface Stats {
  applicants: number
  workflows: number
  activeInstances: number
  completedInstances: number
}

export default function DashboardPage() {
  const [stats, setStats]         = useState<Stats | null>(null)
  const [recent, setRecent]       = useState<WorkflowInstance[]>([])
  const [applicants, setApplicants] = useState<Record<string, Applicant>>({})
  const [workflows, setWorkflows]   = useState<Record<string, Workflow>>({})
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const [apps, wfs, insts] = await Promise.all([
        api.applicants.list(),
        api.workflows.list(),
        api.instances.list(),
      ])
      setStats({
        applicants: apps.length,
        workflows: wfs.length,
        activeInstances: insts.filter((i) => i.status === 'in_progress').length,
        completedInstances: insts.filter((i) => i.status === 'completed').length,
      })
      setRecent(insts.slice(0, 8))
      setApplicants(Object.fromEntries(apps.map((a) => [a.id, a])))
      setWorkflows(Object.fromEntries(wfs.map((w) => [w.id, w])))
      setLoading(false)
    }
    load()
  }, [])

  const statCards = stats
    ? [
        { label: 'Applicants',          value: stats.applicants,          icon: Users,       href: '/applicants' },
        { label: 'Workflows',            value: stats.workflows,            icon: GitBranch,   href: '/workflows' },
        { label: 'Active Instances',     value: stats.activeInstances,     icon: Activity,    href: '/instances' },
        { label: 'Completed Checks',     value: stats.completedInstances,  icon: CheckCircle, href: '/instances' },
      ]
    : []

  return (
    <div className="flex flex-col">
      <Navbar title="Dashboard" />

      <main className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5"><div className="h-12 animate-pulse bg-gray-100 rounded" /></CardContent></Card>
              ))
            : statCards.map(({ label, value, icon: Icon, href }) => (
                <Link href={href} key={label}>
                  <Card className="hover:border-gray-300 transition-colors cursor-pointer">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-0.5">{value}</p>
                      </div>
                      <Icon className="h-8 w-8 text-gray-300" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>

        {/* Recent instances */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Workflow Instances</h2>
            <Link href="/instances" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <CardContent className="py-8 text-center text-sm text-gray-400">Loading…</CardContent>
          ) : recent.length === 0 ? (
            <CardContent className="py-8 text-center text-sm text-gray-400">No instances yet.</CardContent>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.map((inst) => {
                const applicant = applicants[inst.applicant_id]
                const workflow  = workflows[inst.workflow_id]
                const cfg = instanceStatusConfig[inst.status]
                const done = inst.step_instances.filter((s) => s.status === 'completed' || s.status === 'skipped').length
                const total = inst.step_instances.length
                return (
                  <Link key={inst.id} href={`/instances/${inst.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {applicant ? `${applicant.first_name} ${applicant.last_name}` : '—'}
                      </p>
                      <p className="text-xs text-gray-500">{workflow?.name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">{done}/{total} steps</span>
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                      <span className="text-xs text-gray-400">{formatDate(inst.created_at)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
