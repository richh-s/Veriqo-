export type UserRole = 'admin' | 'clerk'
export type ApplicantStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'
export type StepType = 'email' | 'document' | 'manual' | 'identity'
export type InstanceStatus = 'pending' | 'in_progress' | 'completed' | 'failed'
export type StepInstanceStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
export type CommunicationDirection = 'sent' | 'received'
export type AuditAction =
  | 'user_registered' | 'user_logged_in' | 'user_invited'
  | 'applicant_created' | 'applicant_updated' | 'applicant_deleted'
  | 'workflow_created' | 'workflow_updated' | 'workflow_deleted'
  | 'instance_created' | 'step_advanced' | 'instance_completed'
  | 'communication_logged' | 'tenant_disabled' | 'tenant_enabled'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

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

export interface Notification {
  id: string
  tenant_id: string
  user_id: string | null
  message: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  tenant_id: string | null
  user_id: string | null
  action: AuditAction
  entity_type: string | null
  entity_id: string | null
  metadata_: Record<string, unknown> | null
  created_at: string
}

export interface CommunicationLog {
  id: string
  tenant_id: string
  instance_id: string
  step_instance_id: string | null
  logged_by_id: string
  direction: CommunicationDirection
  recipient_name: string | null
  recipient_email: string | null
  subject: string
  body: string
  created_at: string
}

export interface DashboardStats {
  total_applicants: number
  total_workflows: number
  active_instances: number
  completed_instances: number
  failed_instances: number
  pending_notifications: number
}

export interface InstanceTrend {
  date: string
  created: number
  completed: number
}

export interface StepCompletionRate {
  step_name: string
  total: number
  completed: number
  skipped: number
  failed: number
  completion_rate: number
}

export interface AnalyticsOverview {
  stats: DashboardStats
  instance_trend: InstanceTrend[]
  step_completion_rates: StepCompletionRate[]
}

export interface TenantSummary {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  user_count: number
  applicant_count: number
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

export interface CommunicationCreate {
  instance_id: string
  step_instance_id?: string
  direction: CommunicationDirection
  recipient_name?: string
  recipient_email?: string
  subject: string
  body: string
}
