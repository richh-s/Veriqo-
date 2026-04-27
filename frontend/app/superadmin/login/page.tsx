'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useSuperAdminStore } from '@/store/superadmin-store'

export default function SuperAdminLoginPage() {
  const router   = useRouter()
  const setToken = useSuperAdminStore((s) => s.setToken)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await api.superadmin.login({ email, password })
      setToken(access_token)
      router.replace('/superadmin/tenants')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 mb-5 rotate-3 hover:rotate-0 transition-transform cursor-default">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Access Control</h1>
            <p className="text-sm text-gray-500 mt-1.5 text-center">Enter your highly-secure credentials to manage the Veriqo infrastructure.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@checkflow.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
             <div className="space-y-1.5">
              <Label htmlFor="password">Security Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 border-gray-200 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
