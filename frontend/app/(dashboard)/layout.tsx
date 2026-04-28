'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'
import { useAuthStore } from '@/store/auth-store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const token    = useAuthStore((s) => s.token)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !token) router.replace('/login')
  }, [mounted, token, router])

  // Don't render anything until the store has hydrated from localStorage
  if (!mounted) return null
  if (!token) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col md:pl-60 min-w-0">
        {children}
      </div>
    </div>
  )
}
