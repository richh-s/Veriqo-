'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { TenantSummary, PaginatedResponse } from '@/types'

export default function SuperAdminTenantsPage() {
  const [result, setResult]     = useState<PaginatedResponse<TenantSummary> | null>(null)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

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
    setToggling(tenant.id)
    try {
      const updated = await api.superadmin.toggleTenant(tenant.id, !tenant.is_active)
      setResult((prev) =>
        prev ? { ...prev, items: prev.items.map((t) => t.id === updated.id ? updated : t) } : prev
      )
    } finally {
      setToggling(null)
    }
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage all tenant accounts</p>
        </div>
        {result && <span className="text-sm text-gray-500">{result.total} tenant{result.total !== 1 ? 's' : ''}</span>}
      </div>

      <Card>
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : !result?.items.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No tenants found.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Applicants</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium text-gray-900">{tenant.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                        {tenant.slug}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{tenant.user_count}</TableCell>
                    <TableCell className="text-gray-600">{tenant.applicant_count}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{formatDate(tenant.created_at)}</TableCell>
                    <TableCell>
                      <Badge className={tenant.is_active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                      }>
                        {tenant.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggle(tenant)}
                        disabled={toggling === tenant.id}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50 transition-colors"
                      >
                        {tenant.is_active
                          ? <><ToggleRight className="h-4 w-4 text-green-600" />Disable</>
                          : <><ToggleLeft className="h-4 w-4 text-gray-400" />Enable</>
                        }
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {result.pages > 1 && (
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
  )
}
