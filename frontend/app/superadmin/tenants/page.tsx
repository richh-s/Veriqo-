'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, PowerOff, Power, PlusCircle, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import type { TenantSummary, PaginatedResponse } from '@/types'

export default function SuperAdminTenantsPage() {
  const [result, setResult]     = useState<PaginatedResponse<TenantSummary> | null>(null)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating]     = useState(false)
  const [createError, setCreateError] = useState('')
  const [conflictTenant, setConflictTenant] = useState<string | null>(null)
  const [form, setForm] = useState({ company_name: '', slug: '', admin_email: '', admin_full_name: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.superadmin.listTenants({ page, per_page: 20 })
      setResult(res)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  async function handleToggle(tenant: TenantSummary) {
    const action = tenant.is_active ? 'disable' : 'enable'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} tenant "${tenant.name}"?`)) return
    setError(null)
    setToggling(tenant.id)
    try {
      const updated = await api.superadmin.toggleTenant(tenant.id, !tenant.is_active)
      setResult((prev) =>
        prev ? { ...prev, items: prev.items.map((t) => t.id === updated.id ? updated : t) } : prev
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setToggling(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    setConflictTenant(null)
    try {
      const tenant = await api.superadmin.createTenant(form)
      setResult((prev) => prev ? { ...prev, items: [tenant, ...prev.items], total: prev.total + 1 } : prev)
      setCreateOpen(false)
      setForm({ company_name: '', slug: '', admin_email: '', admin_full_name: '' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create tenant'
      const match = msg.match(/already registered under '(.+)'/)
      if (match) {
        setConflictTenant(match[1])
        setCreateError(`That email is already the admin of "${match[1]}". Find it in the list below and activate it instead.`)
      } else {
        setCreateError(msg)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Tenants</h2>
          <p className="text-sm text-gray-500">Monitor and manage all corporate accounts on the Veriqo platform.</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setConflictTenant(null); setCreateError('') }} className="gap-2">
          <PlusCircle className="h-4 w-4" /> Create Tenant
        </Button>
      </div>

      {createOpen && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-900">New Tenant</h3>
            <button onClick={() => { setCreateOpen(false); setConflictTenant(null); setCreateError('') }} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input
                  placeholder="Acme Corp"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+$/, '') })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  placeholder="acme-corp"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Admin Full Name</Label>
                <Input
                  placeholder="Jane Smith"
                  value={form.admin_full_name}
                  onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Admin Email</Label>
                <Input
                  type="email"
                  placeholder="jane@acmecorp.com"
                  value={form.admin_email}
                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">A temporary password will be auto-generated and emailed to the admin.</p>
            {createError && (
              <div className="text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                <p className="text-red-600">{createError}</p>
                {conflictTenant && (
                  <button
                    type="button"
                    onClick={() => {
                      const row = result?.items.find((t) => t.name === conflictTenant)
                      if (row) document.getElementById(`tenant-${row.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="mt-1 text-red-700 underline font-medium"
                  >
                    Jump to "{conflictTenant}" ↓
                  </button>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setConflictTenant(null); setCreateError('') }}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create Tenant'}</Button>
            </div>
          </form>
        </Card>
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <Card className="overflow-hidden border-gray-200 shadow-sm">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium tracking-wide">Syncing records...</p>
          </div>
        ) : !result?.items.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-base font-medium text-gray-900">No tenants yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mt-1">When corporations join Veriqo, they will appear here in this management console.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="w-[300px] py-4">Organization</TableHead>
                  <TableHead className="py-4">Access Slug</TableHead>
                  <TableHead className="py-4">Usage Stats</TableHead>
                  <TableHead className="py-4">Registration</TableHead>
                  <TableHead className="py-4">Status</TableHead>
                  <TableHead className="py-4 text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((tenant) => (
                  <TableRow key={tenant.id} id={`tenant-${tenant.id}`} className={cn("group transition-colors border-gray-100", conflictTenant === tenant.name ? "bg-amber-50 ring-1 ring-amber-300 ring-inset" : "hover:bg-gray-50/50")}>
                    <TableCell className="py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 leading-none mb-1">{tenant.name}</span>
                          <span className="text-xs text-gray-400 font-medium">Internal ID: {tenant.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                        /{tenant.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400 mb-1">Users</span>
                          <span className="text-sm font-medium text-gray-700">{tenant.user_count}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100 mx-1" />
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400 mb-1">Applicants</span>
                          <span className="text-sm font-medium text-gray-700">{tenant.applicant_count}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-gray-500">{formatDate(tenant.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={tenant.is_active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", tenant.is_active ? "bg-green-600" : "bg-red-600")} />
                        {tenant.is_active ? 'Active' : 'Restricted'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <button
                        onClick={() => handleToggle(tenant)}
                        disabled={toggling === tenant.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                          tenant.is_active
                            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        )}
                      >
                        {tenant.is_active ? (
                          <><PowerOff className="h-3.5 w-3.5" />{toggling === tenant.id ? 'Deactivating…' : 'Deactivate'}</>
                        ) : (
                          <><Power className="h-3.5 w-3.5" />{toggling === tenant.id ? 'Activating…' : 'Activate'}</>
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {result.pages > 1 && (
              <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100">
                <Pagination
                  page={result.page}
                  pages={result.pages}
                  total={result.total}
                  per_page={result.per_page}
                  onPage={(p) => setPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
