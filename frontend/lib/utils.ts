import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ApplicantStatus, InstanceStatus, StepInstanceStatus, StepType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const applicantStatusConfig: Record<
  ApplicantStatus,
  { label: string; className: string }
> = {
  pending:     { label: 'Pending',     className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed:   { label: 'Completed',   className: 'bg-green-50 text-green-700 border-green-200' },
  rejected:    { label: 'Rejected',    className: 'bg-red-50 text-red-700 border-red-200' },
}

export const instanceStatusConfig: Record<
  InstanceStatus,
  { label: string; className: string }
> = {
  pending:     { label: 'Pending',     className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed:   { label: 'Completed',   className: 'bg-green-50 text-green-700 border-green-200' },
  failed:      { label: 'Failed',      className: 'bg-red-50 text-red-700 border-red-200' },
}

export const stepStatusConfig: Record<
  StepInstanceStatus,
  { label: string; className: string }
> = {
  pending:     { label: 'Pending',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed:   { label: 'Completed',   className: 'bg-green-50 text-green-700 border-green-200' },
  skipped:     { label: 'Skipped',     className: 'bg-gray-50 text-gray-500 border-gray-200' },
  failed:      { label: 'Failed',      className: 'bg-red-50 text-red-700 border-red-200' },
}

export const stepTypeConfig: Record<StepType, { label: string; className: string }> = {
  email:    { label: 'Email',    className: 'bg-violet-50 text-violet-700 border-violet-200' },
  document: { label: 'Document', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  manual:   { label: 'Manual',   className: 'bg-gray-50 text-gray-700 border-gray-200' },
  identity: { label: 'Identity', className: 'bg-teal-50 text-teal-700 border-teal-200' },
}
