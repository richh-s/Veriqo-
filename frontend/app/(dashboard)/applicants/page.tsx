'use client'

import { useEffect, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ApplicantTable } from '@/components/applicants/applicant-table'
import { ApplicantForm } from '@/components/applicants/applicant-form'
import { api } from '@/lib/api'
import type { Applicant } from '@/types'

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [query, setQuery]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [formOpen, setFormOpen]     = useState(false)
  const [editing, setEditing]       = useState<Applicant | undefined>()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setApplicants(await api.applicants.list())
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(applicant: Applicant) {
    if (!confirm(`Delete ${applicant.first_name} ${applicant.last_name}?`)) return
    await api.applicants.delete(applicant.id)
    setApplicants((prev) => prev.filter((a) => a.id !== applicant.id))
  }

  function handleEdit(applicant: Applicant) {
    setEditing(applicant)
    setFormOpen(true)
  }

  function handleSaved(saved: Applicant) {
    setApplicants((prev) =>
      editing ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev]
    )
  }

  const filtered = applicants.filter((a) => {
    const q = query.toLowerCase()
    return (
      a.first_name.toLowerCase().includes(q) ||
      a.last_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col">
      <Navbar title="Applicants" />

      <main className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => { setEditing(undefined); setFormOpen(true) }} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add applicant
          </Button>
        </div>

        <Card>
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <ApplicantTable applicants={filtered} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </Card>
      </main>

      <ApplicantForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(undefined) }}
        onSaved={handleSaved}
        initial={editing}
      />
    </div>
  )
}
