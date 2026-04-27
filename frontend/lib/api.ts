import type {
  User, Applicant, Workflow, WorkflowInstance,
  LoginRequest, RegisterRequest,
  ApplicantCreate, ApplicantUpdate,
  WorkflowCreate, WorkflowUpdate,
  InstanceCreate, StepUpdate,
} from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('checkflow-auth')
    if (!stored) return null
    return JSON.parse(stored)?.state?.token ?? null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('checkflow-auth')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail ?? 'Request failed')
  }

  return res.json() as Promise<T>
}

export const api = {
  auth: {
    register: (data: RegisterRequest) =>
      request<{ access_token: string }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: LoginRequest) =>
      request<{ access_token: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<User>('/api/v1/auth/me'),
  },

  applicants: {
    list: () => request<Applicant[]>('/api/v1/applicants'),
    get: (id: string) => request<Applicant>(`/api/v1/applicants/${id}`),
    create: (data: ApplicantCreate) =>
      request<Applicant>('/api/v1/applicants', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ApplicantUpdate) =>
      request<Applicant>(`/api/v1/applicants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/v1/applicants/${id}`, { method: 'DELETE' }),
  },

  workflows: {
    list: () => request<Workflow[]>('/api/v1/workflows'),
    get: (id: string) => request<Workflow>(`/api/v1/workflows/${id}`),
    create: (data: WorkflowCreate) =>
      request<Workflow>('/api/v1/workflows', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: WorkflowUpdate) =>
      request<Workflow>(`/api/v1/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/v1/workflows/${id}`, { method: 'DELETE' }),
  },

  instances: {
    list: () => request<WorkflowInstance[]>('/api/v1/instances'),
    get: (id: string) => request<WorkflowInstance>(`/api/v1/instances/${id}`),
    create: (data: InstanceCreate) =>
      request<WorkflowInstance>('/api/v1/instances', { method: 'POST', body: JSON.stringify(data) }),
    advanceStep: (instanceId: string, stepId: string, data: StepUpdate) =>
      request<WorkflowInstance>(`/api/v1/instances/${instanceId}/steps/${stepId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    draftEmail: (instanceId: string, stepId: string) =>
      request<WorkflowInstance>(`/api/v1/instances/${instanceId}/steps/${stepId}/draft-email`, {
        method: 'POST',
      }),
  },
}
