'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Copy, Check, Mail, MessageSquarePlus, SendHorizontal, Inbox, Send } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import {
  instanceStatusConfig, stepStatusConfig, stepTypeConfig, formatDate, formatDateTime, cn,
} from '@/lib/utils'
import type { WorkflowInstance, Applicant, Workflow, StepInstance, StepInstanceStatus, CommunicationLog, CommunicationDirection } from '@/types'

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
  const [sending, setSending]     = useState<string | null>(null)
  const [sent, setSent]           = useState<string | null>(null)
  const [copied, setCopied]       = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [notes, setNotes]         = useState<Record<string, string>>({})
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({})
  const [savingDraft, setSavingDraft] = useState<string | null>(null)

  // Communication log state
  const [comms, setComms]             = useState<CommunicationLog[]>([])
  const [commsLoading, setCommsLoading] = useState(false)
  const [logOpen, setLogOpen]         = useState(false)
  const [logDir, setLogDir]           = useState<CommunicationDirection>('sent')
  const [logSubject, setLogSubject]   = useState('')
  const [logBody, setLogBody]         = useState('')
  const [logRecipient, setLogRecipient] = useState('')
  const [logSaving, setLogSaving]     = useState(false)

  useEffect(() => {
    async function load() {
      const inst = await api.instances.get(id)
      const [app, wf] = await Promise.all([
        api.applicants.get(inst.applicant_id),
        api.workflows.get(inst.workflow_id),
      ])
      // Initialise local drafts from saved values (only on first load)
      setLocalDrafts((prev) => {
        const init: Record<string, string> = { ...prev }
        inst.step_instances.forEach((si) => {
          if (!(si.id in init)) init[si.id] = si.email_draft ?? ''
        })
        return init
      })
      setInstance(inst)
      setApplicant(app)
      setWorkflow(wf)
      setLoading(false)
    }
    load()
    loadComms()
  }, [id])

  async function loadComms() {
    setCommsLoading(true)
    try {
      const res = await api.communications.list({ instance_id: id, per_page: 50 })
      setComms(res.items)
    } finally {
      setCommsLoading(false)
    }
  }

  async function handleLogComm(e: React.FormEvent) {
    e.preventDefault()
    setLogSaving(true)
    try {
      await api.communications.create({
        instance_id: id,
        direction: logDir,
        recipient_email: logRecipient || undefined,
        subject: logSubject,
        body: logBody,
      })
      setLogSubject('')
      setLogBody('')
      setLogRecipient('')
      setLogOpen(false)
      await loadComms()
    } finally {
      setLogSaving(false)
    }
  }

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
    setDraftError(null)
    try {
      const updated = await api.instances.draftEmail(id, stepInstance.id)
      const newSi = updated.step_instances.find((si) => si.id === stepInstance.id)
      if (newSi?.email_draft) {
        setLocalDrafts((prev) => ({ ...prev, [stepInstance.id]: newSi.email_draft! }))
      }
      setInstance(updated)
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'AI drafting failed')
    } finally {
      setDrafting(null)
    }
  }

  async function handleSaveDraft(stepInstance: StepInstance) {
    const draft = localDrafts[stepInstance.id] ?? ''
    setSavingDraft(stepInstance.id)
    try {
      const updated = await api.instances.saveDraft(id, stepInstance.id, draft)
      setInstance(updated)
    } finally {
      setSavingDraft(null)
    }
  }

  async function handleSendEmail(stepInstance: StepInstance) {
    const localDraft = localDrafts[stepInstance.id] ?? ''
    if (!localDraft.trim()) return
    setSending(stepInstance.id)
    try {
      // Auto-save draft if it differs from what's persisted
      if (localDraft !== (stepInstance.email_draft ?? '')) {
        await api.instances.saveDraft(id, stepInstance.id, localDraft)
      }
      const updated = await api.instances.sendEmail(id, stepInstance.id)
      setInstance(updated)
      setSent(stepInstance.id)
      setTimeout(() => setSent(null), 3000)
      await loadComms()
    } finally {
      setSending(null)
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

        {/* Communication log */}
        <Card>
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Communication Log</h2>
              {comms.length > 0 && <span className="text-xs text-gray-400">({comms.length})</span>}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7"
              onClick={() => setLogOpen((o) => !o)}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Log communication
            </Button>
          </div>

          {logOpen && (
            <form onSubmit={handleLogComm} className="border-b border-gray-100 px-5 py-4 space-y-3 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600">Direction</label>
                <div className="flex gap-2">
                  {(['sent', 'received'] as CommunicationDirection[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setLogDir(d)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        logDir === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {d === 'sent' ? <SendHorizontal className="h-3 w-3" /> : <Inbox className="h-3 w-3" />}
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                placeholder="Recipient email (optional)"
                value={logRecipient}
                onChange={(e) => setLogRecipient(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Subject *"
                value={logSubject}
                onChange={(e) => setLogSubject(e.target.value)}
                required
                className="text-sm"
              />
              <Textarea
                placeholder="Message body *"
                value={logBody}
                onChange={(e) => setLogBody(e.target.value)}
                required
                rows={3}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={logSaving} className="text-xs">
                  {logSaving ? 'Saving…' : 'Save entry'}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setLogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {commsLoading ? (
            <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
          ) : comms.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">No communications logged yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {comms.map((c) => (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge className={c.direction === 'sent'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                        }>
                          {c.direction === 'sent'
                            ? <><SendHorizontal className="h-3 w-3 mr-1 inline" />Sent</>
                            : <><Inbox className="h-3 w-3 mr-1 inline" />Received</>
                          }
                        </Badge>
                        <span className="text-sm font-medium text-gray-900 truncate">{c.subject}</span>
                      </div>
                      {c.recipient_email && (
                        <p className="text-xs text-gray-400 mb-1">{c.recipient_email}</p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">{c.body}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{formatDateTime(c.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* AI draft error banner */}
        {draftError && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{draftError}</p>
            <button onClick={() => setDraftError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
          </div>
        )}

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

                {/* Email draft — always shown for email-type steps */}
                {wfStep?.step_type === 'email' && (() => {
                  const localDraft = localDrafts[si.id] ?? ''
                  const isDirty = localDraft !== (si.email_draft ?? '')
                  const hasContent = localDraft.trim().length > 0
                  return (
                    <div className="mx-4 mb-3 rounded-md border border-gray-200 bg-white">
                      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                        <span className="text-xs font-medium text-gray-500">
                          Email draft
                          {isDirty && hasContent && (
                            <span className="ml-1.5 text-amber-500">• unsaved</span>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            disabled={drafting === si.id}
                            onClick={() => handleRegenerateDraft(si)}
                          >
                            <RefreshCw className={`h-3 w-3 ${drafting === si.id ? 'animate-spin' : ''}`} />
                            {drafting === si.id ? 'Generating…' : si.email_draft ? 'Regenerate' : 'Generate with AI'}
                          </Button>
                          {isDirty && hasContent && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              disabled={savingDraft === si.id}
                              onClick={() => handleSaveDraft(si)}
                            >
                              {savingDraft === si.id ? 'Saving…' : 'Save draft'}
                            </Button>
                          )}
                          {hasContent && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => handleCopy(localDraft, si.id)}
                              >
                                {copied === si.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                {copied === si.id ? 'Copied' : 'Copy'}
                              </Button>
                              <Button
                                size="sm"
                                className={`h-7 gap-1 text-xs ${sent === si.id ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                disabled={sending === si.id || sent === si.id}
                                onClick={() => handleSendEmail(si)}
                              >
                                {sent === si.id
                                  ? <><Check className="h-3 w-3" />Sent!</>
                                  : sending === si.id
                                    ? <>Sending…</>
                                    : <><Send className="h-3 w-3" />Send</>
                                }
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <Textarea
                        className="border-0 rounded-none rounded-b-md text-xs font-mono text-gray-700 resize-none focus-visible:ring-0 bg-transparent min-h-[120px]"
                        value={localDraft}
                        onChange={(e) => setLocalDrafts((prev) => ({ ...prev, [si.id]: e.target.value }))}
                        placeholder={`Type your email here…\n\nTip: Start with "Subject: Your subject line" on the first line, then leave a blank line before the body.\n\nOr click "Generate with AI" to auto-draft (requires GROQ_API_KEY).`}
                        rows={8}
                      />
                    </div>
                  )
                })()}

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
