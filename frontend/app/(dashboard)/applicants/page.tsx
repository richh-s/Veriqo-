'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, UserPlus, SlidersHorizontal, Download } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { ApplicantTable, ApplicantTableSkeleton } from '@/components/applicants/applicant-table'
import { ApplicantForm } from '@/components/applicants/applicant-form'
import { api } from '@/lib/api'
import { applicantStatusConfig } from '@/lib/utils'
import type { Applicant, ApplicantStatus, PaginatedResponse } from '@/types'

const STATUS_OPTIONS: { value: ApplicantStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

export default function ApplicantsPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [result, setResult]     = useState<PaginatedResponse<Applicant> | null>(null)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus]     = useState<ApplicantStatus | ''>('')
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState<Applicant | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.applicants.list({
        page,
        per_page: 20,
        search: search || undefined,
        status: status || undefined,
      })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { load() }, [load])

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  function handleStatusChange(val: string) {
    setStatus(val as ApplicantStatus | '')
    setPage(1)
  }

  async function handleDelete(applicant: Applicant) {
    if (!confirm(`Delete ${applicant.first_name} ${applicant.last_name}?`)) return
    await api.applicants.delete(applicant.id)
    load()
  }

  function handleEdit(applicant: Applicant) {
    setEditing(applicant)
    setFormOpen(true)
  }

  function handleSaved(_saved: Applicant) {
    load()
  }

  function exportCSV() {
    const rows = result?.items ?? []
    if (!rows.length) return
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Added']
    const lines = rows.map((a) => [
      a.first_name,
      a.last_name,
      a.email,
      a.phone ?? '',
      a.status,
      new Date(a.created_at).toLocaleDateString(),
    ])
    const csv  = [headers, ...lines].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `applicants-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col">
      <Navbar title="Applicants" />

      <main className="flex-1 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <SlidersHorizontal className="h-4 w-4" />
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            {isAdmin && (
              <Button onClick={() => { setEditing(undefined); setFormOpen(true) }} className="gap-2 shrink-0">
                <UserPlus className="h-4 w-4" />
                Add applicant
              </Button>
            )}
          </div>
        </div>

        {result && (
          <p className="text-sm text-gray-500">
            {result.total} applicant{result.total !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </p>
        )}

        <Card>
          {loading ? (
            <ApplicantTableSkeleton />
          ) : (
            <>
              <ApplicantTable
                applicants={result?.items ?? []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isSearching={!!search || !!status}
              />
              {result && result.pages > 1 && (
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

      <ApplicantForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(undefined) }}
        onSaved={handleSaved}
        initial={editing}
      />
    </div>
  )
}
