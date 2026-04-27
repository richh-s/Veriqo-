'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SuperAdminState {
  token: string | null
  setToken: (token: string) => void
  logout: () => void
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    { name: 'checkflow-superadmin' }
  )
)
