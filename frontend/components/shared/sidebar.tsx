'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, GitBranch, Activity, LogOut, CheckSquare, ScrollText, Bell, X, KeyRound, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useSidebarStore } from '@/store/sidebar-store'
import { logout } from '@/lib/auth'
import { api } from '@/lib/api'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/applicants',    label: 'Applicants',     icon: ScrollText },
  { href: '/workflows',     label: 'Workflows',      icon: GitBranch },
  { href: '/instances',     label: 'Instances',      icon: Activity },
  { href: '/users',         label: 'Team',           icon: Users },
  { href: '/notifications', label: 'Notifications',  icon: Bell },
]

const adminItems = [
  { href: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
]

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.auth.changePassword({ current_password: form.current_password, new_password: form.new_password })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        {success ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-center">Password updated successfully!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {([
              { key: 'current_password', label: 'Current Password', showKey: 'current', placeholder: undefined },
              { key: 'new_password',     label: 'New Password',     showKey: 'new',     placeholder: 'Min 8 chars, 1 uppercase, 1 number' },
              { key: 'confirm_password', label: 'Confirm New Password', showKey: 'confirm', placeholder: undefined },
            ] as const).map(({ key, label, showKey, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <div className="relative">
                  <input
                    type={show[showKey] ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {show[showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const user     = useAuthStore((s) => s.user)
  const isAdmin  = user?.role === 'admin'
  const [showChangePassword, setShowChangePassword] = useState(false)

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
          onClick={() => setShowChangePassword(true)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <KeyRound className="h-4 w-4" />
          Change Password
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
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
