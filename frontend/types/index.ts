export type UserRole = 'admin' | 'clerk'

export type ApplicantStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

export type StepType = 'email' | 'document' | 'manual' | 'identity'

export type InstanceStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export type StepInstanceStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'

export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

export interface Applicant {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  address: string | null
  status: ApplicantStatus
  created_at: string
  updated_at: string
}

export interface WorkflowStep {
  id: string
  workflow_id: string
  name: string
  step_type: StepType
  order: number
  config: Record<string, string> | null
  created_at: string
}

export interface Workflow {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  steps: WorkflowStep[]
}

export interface StepInstance {
  id: string
  instance_id: string
  step_id: string
  status: StepInstanceStatus
  notes: string | null
  email_draft: string | null
  completed_at: string | null
  created_at: string
}

export interface WorkflowInstance {
  id: string
  tenant_id: string
  workflow_id: string
  applicant_id: string
  status: InstanceStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
  step_instances: StepInstance[]
}

// Request types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  tenant_name: string
  tenant_slug: string
  full_name: string
  email: string
  password: string
}

export interface ApplicantCreate {
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
}

export interface ApplicantUpdate {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address?: string
  status?: ApplicantStatus
}

export interface WorkflowStepCreate {
  name: string
  step_type: StepType
  order: number
  config?: Record<string, string>
}

export interface WorkflowCreate {
  name: string
  description?: string
  steps: WorkflowStepCreate[]
}

export interface WorkflowUpdate {
  name?: string
  description?: string
  is_active?: boolean
}

export interface InstanceCreate {
  workflow_id: string
  applicant_id: string
}

export interface StepUpdate {
  status: StepInstanceStatus
  notes?: string
}
