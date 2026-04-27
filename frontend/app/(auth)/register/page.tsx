'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({
    tenant_name: '',
    tenant_slug: '',
    full_name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.auth.register(form)
      setAuth(res.access_token, res.refresh_token, {
        id: '', // Will be filled by /me
        email: form.email,
        full_name: form.full_name,
        role: 'admin',
        tenant_id: '',
        is_active: true,
        created_at: new Date().toISOString()
      })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md my-8">
      <div className="flex items-center justify-center gap-2 mb-8">
        <CheckSquare className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-semibold text-gray-900">Veriqo</span>
      </div>

      <Card>
        <CardHeader className="pb-4 text-center">
          <CardTitle className="text-xl">Create your workspace</CardTitle>
          <CardDescription>Get started with Veriqo and manage your team workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tenant_name">Company Name</Label>
                <Input id="tenant_name" placeholder="Acme Inc" value={form.tenant_name} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant_slug">Workspace URL</Label>
                <div className="relative">
                  <Input id="tenant_slug" placeholder="acme" value={form.tenant_slug} onChange={handleChange} required />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono">.veriqo.io</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name">Your Name</Label>
              <Input id="full_name" placeholder="John Doe" value={form.full_name} onChange={handleChange} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Creating Workspace...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Already have an account?</span>{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
