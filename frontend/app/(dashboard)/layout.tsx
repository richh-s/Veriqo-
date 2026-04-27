'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'
import { useAuthStore } from '@/store/auth-store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token  = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  if (!token) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-60">
        {children}
      </div>
    </div>
  )
}
