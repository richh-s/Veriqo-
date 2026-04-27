'use client'

import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { WorkflowStepCreate } from '@/types'

const STEP_TYPES = [
  { value: 'email',    label: 'Email' },
  { value: 'document', label: 'Document' },
  { value: 'manual',   label: 'Manual' },
  { value: 'identity', label: 'Identity' },
]

interface StepFormProps {
  step:     WorkflowStepCreate
  index:    number
  onChange: (index: number, updated: WorkflowStepCreate) => void
  onRemove: (index: number) => void
}

export function StepForm({ step, index, onChange, onRemove }: StepFormProps) {
  const set = (key: keyof WorkflowStepCreate, value: string) =>
    onChange(index, { ...step, [key]: value })

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Step {index + 1}</span>
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-7 w-7 text-gray-400 hover:text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Step name</Label>
          <Input
            value={step.name}
            placeholder="e.g. Employment Verification"
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={step.step_type} onValueChange={(v) => set('step_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STEP_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {step.step_type === 'email' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Recipient role <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              value={step.config?.recipient_role ?? ''}
              placeholder="e.g. HR Manager"
              onChange={(e) => onChange(index, { ...step, config: { ...step.config, recipient_role: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subject hint <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              value={step.config?.subject ?? ''}
              placeholder="e.g. Background Check Request"
              onChange={(e) => onChange(index, { ...step, config: { ...step.config, subject: e.target.value } })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
