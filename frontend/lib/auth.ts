import { api } from './api'
import { useAuthStore } from '@/store/auth-store'
import type { LoginRequest } from '@/types'

export async function loginAndStoreUser(data: LoginRequest) {
  const { access_token } = await api.auth.login(data)
  // Temporarily store token so api.auth.me can read it
  const draft = { state: { token: access_token, user: null }, version: 0 }
  localStorage.setItem('checkflow-auth', JSON.stringify(draft))

  const user = await api.auth.me()
  useAuthStore.getState().setAuth(access_token, user)
  return user
}

export function logout() {
  useAuthStore.getState().logout()
  window.location.href = '/login'
}
