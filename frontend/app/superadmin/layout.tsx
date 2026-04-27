'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import { useSuperAdminStore } from '@/store/superadmin-store'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const token    = useSuperAdminStore((s) => s.token)

  useEffect(() => {
    if (!token && pathname !== '/superadmin/login') {
      router.replace('/superadmin/login')
    }
  }, [token, pathname, router])

  if (!token && pathname !== '/superadmin/login') return null

  return (
    <div className="min-h-screen bg-gray-50">
      {token && (
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-base font-semibold text-gray-900">CheckFlow Superadmin</span>
          </div>
          <button
            onClick={() => {
              useSuperAdminStore.getState().logout()
              router.replace('/superadmin/login')
            }}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </header>
      )}
      {children}
    </div>
  )
}
