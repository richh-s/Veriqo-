import type {
  User, Applicant, Workflow, WorkflowInstance,
  Notification, AuditLog, AuditAction, CommunicationLog,
  AnalyticsOverview, TenantSummary, PaginatedResponse,
  LoginRequest, RegisterRequest, InviteUserRequest,
  ApplicantCreate, ApplicantUpdate, ApplicantStatus,
  WorkflowCreate, WorkflowUpdate,
  InstanceCreate, InstanceStatus, StepUpdate,
  CommunicationCreate,
} from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function getToken(storeKey = 'checkflow-auth'): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(storeKey)
    if (!stored) return null
    return JSON.parse(stored)?.state?.token ?? null
  } catch {
    return null
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('checkflow-auth')
    if (!stored) return null
    return JSON.parse(stored)?.state?.refreshToken ?? null
  } catch {
    return null
  }
}

async function tryRefresh(): Promise<string | null> {
  const rt = getRefreshToken()
  if (!rt) return null
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.getState().updateTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string | null,
): Promise<T> {
  const token = tokenOverride !== undefined ? tokenOverride : getToken()

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    // No token was sent — this is a login failure (wrong credentials).
    // Let the form handle it; never redirect from a public endpoint.
    if (!token) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }))
      throw new Error(err.detail ?? 'Invalid credentials')
    }

    const isSuperadmin = path.startsWith('/api/v1/superadmin')
    if (!isSuperadmin && tokenOverride === undefined) {
      // Attempt silent token refresh before giving up
      const newToken = await tryRefresh()
      if (newToken) {
        return request<T>(path, options, newToken)
      }
      localStorage.removeItem('checkflow-auth')
      window.location.href = '/login'
    } else if (isSuperadmin) {
      localStorage.removeItem('checkflow-superadmin')
      window.location.href = '/superadmin/login'
    } else {
      localStorage.removeItem('checkflow-auth')
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail ?? 'Request failed')
  }

  return res.json() as Promise<T>
}

function superadminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken('checkflow-superadmin')
  return request<T>(path, options, token)
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const api = {
  auth: {
    register: (data: RegisterRequest) =>
      request<{ access_token: string; refresh_token: string }>('/api/v1/auth/register', {
        method: 'POST', body: JSON.stringify(data),
      }),
    login: (data: LoginRequest) =>
      request<{ access_token: string; refresh_token: string }>('/api/v1/auth/login', {
        method: 'POST', body: JSON.stringify(data),
      }),
    me: () => request<User>('/api/v1/auth/me'),
    listUsers: () => request<User[]>('/api/v1/auth/users'),
    updateUser: (id: string, data: { is_active: boolean }) =>
      request<User>(`/api/v1/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    invite: (data: InviteUserRequest) =>
      request<User>('/api/v1/auth/invite', {
        method: 'POST', body: JSON.stringify(data),
      }),
  },

  applicants: {
    list: (params?: { page?: number; per_page?: number; search?: string; status?: ApplicantStatus }) =>
      request<PaginatedResponse<Applicant>>(`/api/v1/applicants${buildQuery(params ?? {})}`),
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
    list: (params?: { page?: number; per_page?: number; status?: InstanceStatus; applicant_id?: string; workflow_id?: string }) =>
      request<PaginatedResponse<WorkflowInstance>>(`/api/v1/instances${buildQuery(params ?? {})}`),
    get: (id: string) => request<WorkflowInstance>(`/api/v1/instances/${id}`),
    create: (data: InstanceCreate) =>
      request<WorkflowInstance>('/api/v1/instances', { method: 'POST', body: JSON.stringify(data) }),
    advanceStep: (instanceId: string, stepId: string, data: StepUpdate) =>
      request<WorkflowInstance>(`/api/v1/instances/${instanceId}/steps/${stepId}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    saveDraft: (instanceId: string, stepId: string, draft: string) =>
      request<WorkflowInstance>(`/api/v1/instances/${instanceId}/steps/${stepId}/email-draft`, {
        method: 'PATCH', body: JSON.stringify({ draft }),
      }),
    draftEmail: (instanceId: string, stepId: string) =>
      request<WorkflowInstance>(`/api/v1/instances/${instanceId}/steps/${stepId}/draft-email`, {
        method: 'POST',
      }),
    sendEmail: (instanceId: string, stepId: string) =>
      request<WorkflowInstance>(`/api/v1/instances/${instanceId}/steps/${stepId}/send-email`, {
        method: 'POST',
      }),
  },

  notifications: {
    list: (params?: { page?: number; per_page?: number; unread_only?: boolean }) =>
      request<PaginatedResponse<Notification>>(`/api/v1/notifications${buildQuery(params ?? {})}`),
    unreadCount: () => request<{ unread_count: number }>('/api/v1/notifications/unread-count'),
    markRead: (ids: string[]) =>
      request<void>('/api/v1/notifications/mark-read', {
        method: 'POST', body: JSON.stringify({ notification_ids: ids }),
      }),
    markAllRead: () =>
      request<void>('/api/v1/notifications/mark-all-read', { method: 'POST' }),
  },

  analytics: {
    overview: () => request<AnalyticsOverview>('/api/v1/analytics'),
  },

  auditLogs: {
    list: (params?: { page?: number; per_page?: number; action?: AuditAction }) =>
      request<PaginatedResponse<AuditLog>>(`/api/v1/audit-logs${buildQuery(params ?? {})}`),
  },

  communications: {
    list: (params?: { page?: number; per_page?: number; instance_id?: string }) =>
      request<PaginatedResponse<CommunicationLog>>(`/api/v1/communications${buildQuery(params ?? {})}`),
    create: (data: CommunicationCreate) =>
      request<CommunicationLog>('/api/v1/communications', {
        method: 'POST', body: JSON.stringify(data),
      }),
  },

  superadmin: {
    login: (data: LoginRequest) =>
      request<{ access_token: string }>('/api/v1/superadmin/login', {
        method: 'POST', body: JSON.stringify(data),
      }),
    listTenants: (params?: { page?: number; per_page?: number }) =>
      superadminRequest<PaginatedResponse<TenantSummary>>(
        `/api/v1/superadmin/tenants${buildQuery(params ?? {})}`
      ),
    toggleTenant: (id: string, is_active: boolean) =>
      superadminRequest<TenantSummary>(`/api/v1/superadmin/tenants/${id}`, {
        method: 'PATCH', body: JSON.stringify({ is_active }),
      }),
  },
}
