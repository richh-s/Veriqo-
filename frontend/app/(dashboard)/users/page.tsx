'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, Shield, User as UserIcon, PowerOff, Power, KeyRound, Copy, CheckCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { UserOut } from '@/types'

export default function TeamPage() {
  const [users, setUsers] = useState<UserOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'admin' as 'admin'
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ email: string; temp_password: string; email_sent: boolean; email_error: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadUsers() }, [])


  async function loadUsers() {
    setLoading(true)
    try {
      const res = await api.auth.listUsers()
      setUsers(res)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.auth.invite(inviteForm)
      setShowInvite(false)
      setInviteForm({ email: '', full_name: '', password: '', role: 'admin' })
      loadUsers()
    } catch (err: any) {
      setError(err.message || 'Invitation failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(user: UserOut) {
    if (!confirm(`Reset password for ${user.full_name}? They will receive a new temporary password.`)) return
    setResetting(user.id)
    try {
      const result = await api.auth.resetUserPassword(user.id)
      setResetResult(result)
    } catch (err: any) {
      setError(err.message || 'Password reset failed')
    } finally {
      setResetting(null)
    }
  }

  async function handleToggleActive(user: UserOut) {
    setToggling(user.id)
    try {
      const updated = await api.auth.updateUser(user.id, { is_active: !user.is_active })
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
    } finally {
      setToggling(null)
    }
  }

  return (
    <main className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team members and their access levels.</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {resetResult && (
        <div className={`rounded-lg border px-5 py-4 ${resetResult.email_sent ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className={`text-sm font-semibold mb-1 ${resetResult.email_sent ? 'text-green-800' : 'text-amber-800'}`}>
                Password reset — {resetResult.email_sent ? 'new credentials emailed ✓' : 'email not sent, share manually'}
              </p>
              {!resetResult.email_sent && resetResult.email_error && (
                <p className="text-xs text-amber-700 mb-2">{resetResult.email_error.includes('verify a domain') ? 'Resend requires a verified domain to send to external addresses.' : resetResult.email_error}</p>
              )}
              <div className="font-mono text-sm bg-white border border-gray-200 rounded-md px-4 py-3 space-y-1">
                <p><span className="text-gray-500">Email:</span> {resetResult.email}</p>
                <p><span className="text-gray-500">Password:</span> {resetResult.temp_password}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${resetResult.email}\nPassword: ${resetResult.temp_password}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                {copied ? <><CheckCheck className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy credentials</>}
              </button>
            </div>
            <button onClick={() => setResetResult(null)} className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {showInvite && (
        <Card className="border-blue-100 shadow-lg shadow-blue-50 animate-in fade-in zoom-in duration-200">
          <CardHeader>
            <CardTitle className="text-lg">Invite New Member</CardTitle>
            <CardDescription>Enter details to add a new team member to your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input 
                    id="full_name" 
                    placeholder="Jane Smith" 
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="jane@company.com" 
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Set a password for them"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowInvite(false)} type="button">Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Sending Invitation...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[300px]">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-gray-400">Loading team members...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center flex flex-col items-center">
                  <Users className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-gray-500">No team members found.</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="group transition-colors hover:bg-gray-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{user.full_name}</span>
                        <span className="text-xs text-gray-400">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={user.role === 'admin' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-gray-200 text-gray-600 bg-gray-50 font-normal'}>
                      {user.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <UserIcon className="h-3 w-3 mr-1" />}
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <div className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                       <span className="text-xs font-medium text-gray-600">{user.is_active ? 'Active' : 'Deactivated'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleResetPassword(user)}
                        disabled={resetting === user.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {resetting === user.id ? 'Resetting…' : 'Reset Password'}
                      </button>
                      {user.is_active ? (
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={toggling === user.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <PowerOff className="h-3.5 w-3.5" />
                          {toggling === user.id ? 'Deactivating…' : 'Deactivate'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={toggling === user.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {toggling === user.id ? 'Activating…' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </main>
  )
}
