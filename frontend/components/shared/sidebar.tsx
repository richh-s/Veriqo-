'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, GitBranch, Activity, LogOut, CheckSquare, ScrollText, Bell, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useSidebarStore } from '@/store/sidebar-store'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/applicants',    label: 'Applicants',     icon: Users },
  { href: '/workflows',     label: 'Workflows',      icon: GitBranch },
  { href: '/instances',     label: 'Instances',      icon: Activity },
  { href: '/notifications', label: 'Notifications',  icon: Bell },
]

const adminItems = [
  { href: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const user     = useAuthStore((s) => s.user)
  const isAdmin  = user?.role === 'admin'

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {isAdmin && (
          <>
            <p className="mt-5 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Admin
            </p>
            <ul className="space-y-0.5">
              {adminItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-gray-200 p-3">
        {user && (
          <div className="mb-2 px-3 py-1">
            <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  const open  = useSidebarStore((s) => s.open)
  const close = useSidebarStore((s) => s.close)

  return (
    <>
      {/* Desktop — always visible */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-5">
          <CheckSquare className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-900">Veriqo</span>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile — slide-in overlay */}
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-5">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                <span className="text-base font-semibold text-gray-900">Veriqo</span>
              </div>
              <button onClick={close} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  )
}
