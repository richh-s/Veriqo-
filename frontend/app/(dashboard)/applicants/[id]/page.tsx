'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Activity } from 'lucide-react'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApplicantForm } from '@/components/applicants/applicant-form'
import { api } from '@/lib/api'
import { applicantStatusConfig, instanceStatusConfig, formatDate } from '@/lib/utils'
import type { Applicant, WorkflowInstance } from '@/types'

export default function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [applicant, setApplicant]   = useState<Applicant | null>(null)
  const [instances, setInstances]   = useState<WorkflowInstance[]>([])
  const [formOpen, setFormOpen]     = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      const [app, insts] = await Promise.all([
        api.applicants.get(id),
        api.instances.list({ applicant_id: id, per_page: 50 }),
      ])
      setApplicant(app)
      setInstances(insts.items)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="flex flex-col"><Navbar title="Applicant" /><div className="p-6 text-sm text-gray-400">Loading…</div></div>
  if (!applicant) return <div className="flex flex-col"><Navbar title="Applicant" /><div className="p-6 text-sm text-gray-500">Not found.</div></div>

  const statusCfg = applicantStatusConfig[applicant.status]

  return (
    <div className="flex flex-col">
      <Navbar title="Applicant Detail" />

      <main className="flex-1 p-6 space-y-5 max-w-3xl">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-gray-500 -ml-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Profile card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{applicant.first_name} {applicant.last_name}</CardTitle>
                <Badge className={`${statusCfg.className} mt-2`}>{statusCfg.label}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              {applicant.email}
            </div>
            {applicant.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                {applicant.phone}
              </div>
            )}
            {applicant.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                {applicant.address}
              </div>
            )}
            <p className="text-xs text-gray-400 pt-1">Added {formatDate(applicant.created_at)}</p>
          </CardContent>
        </Card>

        {/* Linked instances */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />
            Workflow Instances
          </h2>
          {instances.length === 0 ? (
            <p className="text-sm text-gray-400">No workflow instances for this applicant.</p>
          ) : (
            <div className="space-y-2">
              {instances.map((inst) => {
                const cfg = instanceStatusConfig[inst.status]
                const done  = inst.step_instances.filter((s) => ['completed', 'skipped'].includes(s.status)).length
                const total = inst.step_instances.length
                return (
                  <Link key={inst.id} href={`/instances/${inst.id}`}>
                    <Card className="hover:border-gray-300 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Instance</p>
                          <p className="text-xs text-gray-500">{done}/{total} steps · Started {formatDate(inst.created_at)}</p>
                        </div>
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <ApplicantForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => setApplicant(saved)}
        initial={applicant}
      />
    </div>
  )
}
