'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusCircle, GitBranch } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { WorkflowForm } from '@/components/workflows/workflow-form'
import { stepTypeConfig } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { Workflow } from '@/types'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading]     = useState(true)
  const [formOpen, setFormOpen]   = useState(false)
  const isAdmin = useAuthStore((s) => s.isAdmin())

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setWorkflows(await api.workflows.list()) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col">
      <Navbar title="Workflows" />

      <main className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''}</p>
          {isAdmin && (
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New workflow
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><div className="h-24 animate-pulse bg-gray-100 rounded" /></CardContent></Card>
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GitBranch className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No workflows yet.</p>
            {isAdmin && <Button className="mt-4 gap-2" onClick={() => setFormOpen(true)}><PlusCircle className="h-4 w-4" />Create your first workflow</Button>}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((wf) => (
              <Link key={wf.id} href={`/workflows/${wf.id}`}>
                <Card className="hover:border-gray-300 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{wf.name}</CardTitle>
                      <Badge className={wf.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>
                        {wf.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {wf.description && <CardDescription className="text-xs line-clamp-2">{wf.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {wf.steps.map((step) => {
                        const cfg = stepTypeConfig[step.step_type]
                        return (
                          <Badge key={step.id} className={`${cfg.className} text-xs`}>{cfg.label}</Badge>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <WorkflowForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => setWorkflows((prev) => [saved, ...prev])}
      />
    </div>
  )
}
