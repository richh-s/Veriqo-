'use client'

import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { applicantStatusConfig, formatDate } from '@/lib/utils'
import type { Applicant } from '@/types'

interface ApplicantTableProps {
  applicants: Applicant[]
  onEdit:   (applicant: Applicant) => void
  onDelete: (applicant: Applicant) => void
}

export function ApplicantTable({ applicants, onEdit, onDelete }: ApplicantTableProps) {
  if (applicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">No applicants yet. Add one to get started.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Added</TableHead>
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
              <TableCell>{a.email}</TableCell>
              <TableCell>{a.phone ?? <span className="text-gray-400">—</span>}</TableCell>
              <TableCell>
                <Badge className={status.className}>{status.label}</Badge>
              </TableCell>
              <TableCell>{formatDate(a.created_at)}</TableCell>
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
  )
}
