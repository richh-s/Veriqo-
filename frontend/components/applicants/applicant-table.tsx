'use client'

import Link from 'next/link'
import { Pencil, Trash2, Users } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { applicantStatusConfig, formatDate } from '@/lib/utils'
import type { Applicant } from '@/types'

interface ApplicantTableProps {
  applicants: Applicant[]
  onEdit:   (applicant: Applicant) => void
  onDelete: (applicant: Applicant) => void
  isSearching?: boolean
}

export function ApplicantTableSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
          <div className="h-4 w-32 rounded bg-gray-100" />
          <div className="h-4 w-40 rounded bg-gray-100" />
          <div className="h-4 w-24 rounded bg-gray-100" />
          <div className="h-5 w-20 rounded-full bg-gray-100" />
          <div className="h-4 w-20 rounded bg-gray-100 ml-auto" />
        </div>
      ))}
    </div>
  )
}

export function ApplicantTable({ applicants, onEdit, onDelete, isSearching }: ApplicantTableProps) {
  if (applicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-sm font-medium text-gray-700">
          {isSearching ? 'No applicants match your search' : 'No applicants yet'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {isSearching ? 'Try a different name or email.' : 'Add your first applicant to get started.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden sm:table-cell">Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Added</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {applicants.map((a) => {
            const status = applicantStatusConfig[a.status]
            return (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/applicants/${a.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                    {a.first_name} {a.last_name}
                  </Link>
                </TableCell>
                <TableCell className="text-gray-600 max-w-[200px] truncate">{a.email}</TableCell>
                <TableCell className="hidden sm:table-cell">{a.phone ?? <span className="text-gray-400">—</span>}</TableCell>
                <TableCell>
                  <Badge className={status.className}>{status.label}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(a.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(a)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(a)} aria-label="Delete" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
