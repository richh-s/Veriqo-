'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Copy, Check } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import {
  instanceStatusConfig, stepStatusConfig, stepTypeConfig, formatDate, formatDateTime,
} from '@/lib/utils'
import type { WorkflowInstance, Applicant, Workflow, StepInstance, StepInstanceStatus } from '@/types'

const ADVANCE_ACTIONS: { status: StepInstanceStatus; label: string; className: string }[] = [
  { status: 'completed', label: 'Mark complete', className: 'bg-green-600 hover:bg-green-700 text-white' },
  { status: 'skipped',   label: 'Skip',           className: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
  { status: 'failed',    label: 'Mark failed',    className: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200' },
]

export default function InstanceDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [instance, setInstance]   = useState<WorkflowInstance | null>(null)
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [workflow, setWorkflow]   = useState<Workflow | null>(null)
  const [loading, setLoading]     = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [drafting, setDrafting]   = useState<string | null>(null)
  const [copied, setCopied]       = useState<string | null>(null)
  const [notes, setNotes]         = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const inst = await api.instances.get(id)
      const [app, wf] = await Promise.all([
        api.applicants.get(inst.applicant_id),
        api.workflows.get(inst.workflow_id),
      ])
      setInstance(inst)
      setApplicant(app)
      setWorkflow(wf)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleAdvance(stepInstance: StepInstance, status: StepInstanceStatus) {
    setAdvancing(stepInstance.id)
    try {
      const updated = await api.instances.advanceStep(id, stepInstance.id, {
        status,
        notes: notes[stepInstance.id] || undefined,
      })
      setInstance(updated)
    } finally {
      setAdvancing(null)
    }
  }

  async function handleRegenerateDraft(stepInstance: StepInstance) {
    setDrafting(stepInstance.id)
    try {
      const updated = await api.instances.draftEmail(id, stepInstance.id)
      setInstance(updated)
    } finally {
      setDrafting(null)
    }
  }

  async function handleCopy(text: string, stepId: string) {
    await navigator.clipboard.writeText(text)
    setCopied(stepId)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return <div className="flex flex-col"><Navbar title="Instance" /><div className="p-6 text-sm text-gray-400">Loading…</div></div>
  if (!instance || !applicant || !workflow) return null

  const instCfg = instanceStatusConfig[instance.status]

  // Map step_id → workflow step name/type for rendering
  const stepMap = Object.fromEntries(workflow.steps.map((s) => [s.id, s]))

  return (
    <div className="flex flex-col">
      <Navbar title="Instance Detail" />

      <main className="flex-1 p-6 space-y-5 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-gray-500 -ml-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Header */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-900 text-base">
                  {applicant.first_name} {applicant.last_name}
                </p>
                <p className="text-sm text-gray-500">{workflow.name}</p>
                <p className="text-xs text-gray-400">Started {formatDate(instance.created_at)}</p>
              </div>
              <Badge className={instCfg.className}>{instCfg.label}</Badge>
            </div>

            {/* Overall progress bar */}
            {(() => {
              const total = instance.step_instances.length
              const done  = instance.step_instances.filter((s) => ['completed', 'skipped'].includes(s.status)).length
              return total > 0 ? (
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Progress</span>
                    <span>{done}/{total} steps</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${(done / total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : null
            })()}
          </CardContent>
        </Card>

        {/* Step instances */}
        <div className="space-y-3">
          {instance.step_instances.map((si, idx) => {
            const wfStep   = stepMap[si.step_id]
            const stepCfg  = stepStatusConfig[si.status]
            const typeCfg  = wfStep ? stepTypeConfig[wfStep.step_type] : null
            const isActive = si.status === 'in_progress'

            return (
              <div
                key={si.id}
                className={`rounded-lg border ${isActive ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'}`}
              >
                {/* Step header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 border border-gray-300'}`}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-900">{wfStep?.name ?? 'Step'}</span>
                  <div className="flex items-center gap-2">
                    {typeCfg && <Badge className={`${typeCfg.className} text-xs`}>{typeCfg.label}</Badge>}
                    <Badge className={`${stepCfg.className} text-xs`}>{stepCfg.label}</Badge>
                    {si.completed_at && (
                      <span className="text-xs text-gray-400">{formatDateTime(si.completed_at)}</span>
                    )}
                  </div>
                </div>

                {/* Email draft (for email-type steps with a draft) */}
                {wfStep?.step_type === 'email' && si.email_draft && (
                  <div className="mx-4 mb-3 rounded-md border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                      <span className="text-xs font-medium text-gray-500">AI-drafted email</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={drafting === si.id}
                          onClick={() => handleRegenerateDraft(si)}
                        >
                          <RefreshCw className={`h-3 w-3 ${drafting === si.id ? 'animate-spin' : ''}`} />
                          Regenerate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleCopy(si.email_draft!, si.id)}
                        >
                          {copied === si.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          {copied === si.id ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      className="border-0 rounded-none rounded-b-md text-xs font-mono text-gray-700 resize-none focus:ring-0 bg-transparent min-h-[120px]"
                      value={si.email_draft}
                      readOnly
                      rows={8}
                    />
                  </div>
                )}

                {/* Notes + actions for active step */}
                {isActive && (
                  <div className="px-4 pb-4 space-y-3">
                    <Textarea
                      placeholder="Add notes (optional)…"
                      value={notes[si.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [si.id]: e.target.value }))}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      {ADVANCE_ACTIONS.map((action) => (
                        <button
                          key={action.status}
                          onClick={() => handleAdvance(si, action.status)}
                          disabled={advancing === si.id}
                          className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${action.className}`}
                        >
                          {advancing === si.id ? 'Saving…' : action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes display for completed steps */}
                {!isActive && si.notes && (
                  <p className="px-4 pb-3 text-xs text-gray-500 italic">{si.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
