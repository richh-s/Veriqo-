'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Shield, Building2, LogOut, LayoutDashboard, Settings } from 'lucide-react'
import { useSuperAdminStore } from '@/store/superadmin-store'
import { cn } from '@/lib/utils'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, logout } = useSuperAdminStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !token && !pathname.includes('/login')) {
      router.push('/superadmin/login')
    }
  }, [token, pathname, router, mounted])

  if (!mounted) return null
  if (pathname.includes('/login')) return <>{children}</>

  const navItems = [
    { label: 'Tenants', icon: Building2, href: '/superadmin/tenants' },
  ]

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 gap-2.5">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">SuperAdmin</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-4 w-4", pathname === item.href ? "text-blue-600" : "text-gray-400")} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => {
              logout()
              router.push('/superadmin/login')
            }}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-gray-900">Platform Management</h1>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500 capitalize">{pathname.split('/').pop()}</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
               <Shield className="h-4 w-4 text-gray-500" />
             </div>
             <span className="text-xs font-medium text-gray-700">Root Superadmin</span>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
