'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Active Tenants</h2>
        <p className="text-sm text-gray-500">Monitor and manage all corporate accounts on the Veriqo platform.</p>
      </div>

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
                  <TableRow key={tenant.id} className="group hover:bg-gray-50/50 transition-colors border-gray-100">
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
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                          tenant.is_active
                            ? "text-red-500 hover:bg-red-50 active:scale-95"
                            : "text-blue-600 hover:bg-blue-50 active:scale-95"
                        )}
                      >
                        {tenant.is_active ? (
                          <><ToggleRight className="h-4 w-4" /> Suspend Access</>
                        ) : (
                          <><ToggleLeft className="h-4 w-4" /> Restore Access</>
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
