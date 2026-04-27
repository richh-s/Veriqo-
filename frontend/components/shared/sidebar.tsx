'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, GitBranch, Activity, LogOut, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/applicants', label: 'Applicants', icon: Users },
  { href: '/workflows',  label: 'Workflows',  icon: GitBranch },
  { href: '/instances',  label: 'Instances',  icon: Activity },
]

export function Sidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-5">
        <CheckSquare className="h-5 w-5 text-blue-600" />
        <span className="text-base font-semibold text-gray-900">CheckFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User + Logout */}
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
    </aside>
  )
}
