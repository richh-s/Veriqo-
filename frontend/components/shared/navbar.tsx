'use client'

import { useAuthStore } from '@/store/auth-store'

interface NavbarProps {
  title: string
}

export function Navbar({ title }: NavbarProps) {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      {user && (
        <span className="text-sm text-gray-500">{user.email}</span>
      )}
    </header>
  )
}
