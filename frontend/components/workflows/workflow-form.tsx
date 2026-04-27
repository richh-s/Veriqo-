'use client'

import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { StepForm } from './step-form'
import { api } from '@/lib/api'
import type { Workflow, WorkflowCreate, WorkflowStepCreate } from '@/types'

interface WorkflowFormProps {
  open:    boolean
  onClose: () => void
  onSaved: (workflow: Workflow) => void
}

const blankStep = (): WorkflowStepCreate => ({
  name: '', step_type: 'manual', order: 0,
})

export function WorkflowForm({ open, onClose, onSaved }: WorkflowFormProps) {
  const [name, setName]           = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps]         = useState<WorkflowStepCreate[]>([blankStep()])
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  function addStep() {
    setSteps((s) => [...s, blankStep()])
  }

  function updateStep(index: number, updated: WorkflowStepCreate) {
    setSteps((s) => s.map((step, i) => (i === index ? updated : step)))
  }

  function removeStep(index: number) {
    setSteps((s) => s.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload: WorkflowCreate = {
        name,
        description: description || undefined,
        steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
      }
      const saved = await api.workflows.create(payload)
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
          <DialogDescription>Define a reusable background check workflow with ordered steps.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="wf-name">Workflow name</Label>
            <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Employment Check" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wf-desc">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea id="wf-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this workflow is used for…" rows={2} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Steps</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addStep} className="h-7 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <PlusCircle className="h-3.5 w-3.5" />
                Add step
              </Button>
            </div>
            {steps.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No steps added yet.</p>
            )}
            <div className="space-y-2">
              {steps.map((step, i) => (
                <StepForm key={i} step={step} index={i} onChange={updateStep} onRemove={removeStep} />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create workflow'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
