'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { Applicant, ApplicantCreate, ApplicantUpdate } from '@/types'

interface ApplicantFormProps {
  open: boolean
  onClose: () => void
  onSaved: (applicant: Applicant) => void
  initial?: Applicant
}

export function ApplicantForm({ open, onClose, onSaved, initial }: ApplicantFormProps) {
  const [form, setForm] = useState({
    first_name: initial?.first_name ?? '',
    last_name:  initial?.last_name  ?? '',
    email:      initial?.email      ?? '',
    phone:      initial?.phone      ?? '',
    address:    initial?.address    ?? '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        phone:   form.phone   || undefined,
        address: form.address || undefined,
      }
      const saved = initial
        ? await api.applicants.update(initial.id, payload as ApplicantUpdate)
        : await api.applicants.create(payload as ApplicantCreate)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Applicant' : 'Add Applicant'}</DialogTitle>
          <DialogDescription>
            {initial ? 'Update applicant details.' : 'Add a new applicant to this tenant.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : initial ? 'Save changes' : 'Add applicant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
