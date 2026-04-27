'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, PlayCircle, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { stepTypeConfig, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import type { Workflow, Applicant } from '@/types'

export default function WorkflowDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const isAdmin = useAuthStore((s) => s.isAdmin())

  const [workflow, setWorkflow]     = useState<Workflow | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading]       = useState(true)
  const [startOpen, setStartOpen]   = useState(false)
  const [selectedApp, setSelectedApp] = useState('')
  const [starting, setStarting]     = useState(false)
  const [startError, setStartError] = useState('')

  useEffect(() => {
    async function load() {
      const [wf, apps] = await Promise.all([api.workflows.get(id), api.applicants.list()])
      setWorkflow(wf)
      setApplicants(apps)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleDelete() {
    if (!confirm('Delete this workflow? This cannot be undone.')) return
    await api.workflows.delete(id)
    router.push('/workflows')
  }

  async function handleStartInstance() {
    if (!selectedApp) return
    setStarting(true)
    setStartError('')
    try {
      const inst = await api.instances.create({ workflow_id: id, applicant_id: selectedApp })
      router.push(`/instances/${inst.id}`)
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Failed to start instance')
      setStarting(false)
    }
  }

  if (loading) return <div className="flex flex-col"><Navbar title="Workflow" /><div className="p-6 text-sm text-gray-400">Loading…</div></div>
  if (!workflow) return <div className="flex flex-col"><Navbar title="Workflow" /><div className="p-6 text-sm text-gray-500">Not found.</div></div>

  return (
    <div className="flex flex-col">
      <Navbar title="Workflow Detail" />

      <main className="flex-1 p-6 space-y-5 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-gray-500 -ml-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg">{workflow.name}</CardTitle>
                {workflow.description && <p className="text-sm text-gray-500">{workflow.description}</p>}
                <p className="text-xs text-gray-400">Created {formatDate(workflow.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={workflow.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>
                  {workflow.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Button size="sm" onClick={() => setStartOpen(true)} className="gap-1.5">
                  <PlayCircle className="h-4 w-4" /> Start
                </Button>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={handleDelete} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Steps */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{workflow.steps.length} Step{workflow.steps.length !== 1 ? 's' : ''}</h2>
          {workflow.steps.length === 0 ? (
            <p className="text-sm text-gray-400">No steps defined.</p>
          ) : (
            <div className="space-y-2">
              {workflow.steps.map((step, i) => {
                const cfg = stepTypeConfig[step.step_type]
                return (
                  <div key={step.id} className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-medium text-gray-500">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-900">{step.name}</span>
                    <Badge className={`${cfg.className} text-xs`}>{cfg.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Start instance dialog */}
      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Workflow Instance</DialogTitle>
            <DialogDescription>Select an applicant to run this workflow for.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Applicant</Label>
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger><SelectValue placeholder="Select applicant…" /></SelectTrigger>
                <SelectContent>
                  {applicants.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name} — {a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {startError && <p className="text-sm text-red-600">{startError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStartOpen(false)} disabled={starting}>Cancel</Button>
              <Button onClick={handleStartInstance} disabled={!selectedApp || starting}>
                {starting ? 'Starting…' : 'Start instance'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
