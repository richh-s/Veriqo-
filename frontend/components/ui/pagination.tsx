'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pages: number
  total: number
  per_page: number
  onPage: (page: number) => void
}

export function Pagination({ page, pages, total, per_page, onPage }: PaginationProps) {
  if (pages <= 1) return null

  const from = (page - 1) * per_page + 1
  const to = Math.min(page * per_page, total)

  const getPages = () => {
    const result: (number | '…')[] = []
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) result.push(i)
    } else {
      result.push(1)
      if (page > 3) result.push('…')
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) result.push(i)
      if (page < pages - 2) result.push('…')
      result.push(pages)
    }
    return result
  }

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-gray-500">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="rounded p-1 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={cn(
                'min-w-[2rem] rounded px-2 py-1 text-sm font-medium transition-colors',
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className="rounded p-1 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
