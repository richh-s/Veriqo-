# Veriqo — Background Check Management SaaS

A multi-tenant background check platform where companies manage applicant verification workflows, with a superadmin layer for platform-wide tenant management.

---

## Quick Start

### Docker (recommended)

```bash
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Manual Setup

**Backend**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # set DATABASE_URL, SECRET_KEY, GROQ_API_KEY, RESEND_API_KEY
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

---

## Demo Credentials

| Role | Email | Password | Login URL |
|---|---|---|---|
| **Superadmin** | `super@veriqo.com` | `Admin123` | `/superadmin/login` |
| **Admin** | `admin@acme.com` | `Admin123` | `/login` |
| **Admin** | `bob@acme.com` | `Admin123` | `/login` |

> Public self-registration is disabled. Superadmin creates tenants; admins invite team members.

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Browser["Browser"]
        FE["Next.js 14\nApp Router + Zustand"]
    end

    subgraph Docker["Docker Compose"]
        subgraph Backend["backend"]
            API["FastAPI\nREST API"]
            SVC["Services"]
            JWT["JWT Auth\naccess + refresh\n(stateless)"]
        end
        subgraph Frontend["frontend"]
            FE
        end
        subgraph DB["db"]
            PG[("PostgreSQL 15\n./pgdata bind mount")]
        end
    end

    subgraph External["External Services"]
        GROQ["Groq\nllama-3.1-8b-instant\nAI email drafting"]
        RESEND["Resend\nWelcome / invite /\ndeactivation emails"]
    end

    FE -->|"Bearer JWT"| API
    API --> JWT
    JWT --> SVC
    SVC <-->|"SQLAlchemy async"| PG
    SVC -->|"draft generation"| GROQ
    SVC -->|"transactional email"| RESEND
```

### Data Model

```mermaid
erDiagram
    SUPERADMIN {
        uuid id PK
        string email
        string hashed_password
        string full_name
        bool is_active
        datetime created_at
    }

    TENANT {
        uuid id PK
        string name
        string slug
        bool is_active
        datetime created_at
    }

    USER {
        uuid id PK
        uuid tenant_id FK
        string email
        string full_name
        string hashed_password
        string role
        bool is_active
        datetime created_at
    }

    APPLICANT {
        uuid id PK
        uuid tenant_id FK
        string first_name
        string last_name
        string email
        string phone
        string address
        string status
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    WORKFLOW {
        uuid id PK
        uuid tenant_id FK
        string name
        string description
        bool is_active
        datetime created_at
        datetime updated_at
    }

    WORKFLOW_STEP {
        uuid id PK
        uuid workflow_id FK
        string name
        string step_type
        int order
        json config
        datetime created_at
    }

    WORKFLOW_INSTANCE {
        uuid id PK
        uuid tenant_id FK
        uuid workflow_id FK
        uuid applicant_id FK
        string status
        datetime started_at
        datetime completed_at
        datetime created_at
    }

    WORKFLOW_STEP_INSTANCE {
        uuid id PK
        uuid instance_id FK
        uuid step_id FK
        string status
        text notes
        text email_draft
        datetime completed_at
        datetime created_at
    }

    NOTIFICATION {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        text message
        string entity_type
        uuid entity_id
        bool is_read
        datetime created_at
    }

    COMMUNICATION_LOG {
        uuid id PK
        uuid tenant_id FK
        uuid instance_id FK
        uuid step_instance_id FK
        uuid logged_by_id FK
        string direction
        string recipient_name
        string recipient_email
        string subject
        text body
        datetime created_at
    }

    AUDIT_LOG {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        json metadata
        datetime created_at
    }

    TENANT ||--o{ USER : "has"
    TENANT ||--o{ APPLICANT : "has"
    TENANT ||--o{ WORKFLOW : "has"
    TENANT ||--o{ WORKFLOW_INSTANCE : "scopes"
    TENANT ||--o{ NOTIFICATION : "receives"
    TENANT ||--o{ COMMUNICATION_LOG : "logs"
    TENANT ||--o{ AUDIT_LOG : "audits"
    WORKFLOW ||--o{ WORKFLOW_STEP : "defines"
    WORKFLOW ||--o{ WORKFLOW_INSTANCE : "runs as"
    APPLICANT ||--o{ WORKFLOW_INSTANCE : "subject of"
    WORKFLOW_INSTANCE ||--o{ WORKFLOW_STEP_INSTANCE : "tracks"
    WORKFLOW_INSTANCE ||--o{ COMMUNICATION_LOG : "records"
    WORKFLOW_STEP ||--o{ WORKFLOW_STEP_INSTANCE : "mirrors"
    WORKFLOW_STEP_INSTANCE ||--o| COMMUNICATION_LOG : "linked to"
    USER ||--o{ COMMUNICATION_LOG : "logged by"
    USER ||--o{ NOTIFICATION : "notified"
```

### Key Flows

**Authentication**
```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL

    A->>FE: Enter credentials
    FE->>API: POST /auth/login
    API->>DB: Verify user + tenant active check
    API->>DB: Write audit log (user_logged_in)
    API-->>FE: access_token (15m) + refresh_token (7d)
    Note over FE: Zustand persist stores tokens

    A->>FE: Token expires
    FE->>API: POST /auth/refresh {refresh_token}
    API-->>FE: New access_token
```

**Tenant Creation (Superadmin)**
```mermaid
sequenceDiagram
    actor SA as Superadmin
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Email as Resend

    SA->>FE: Fill create tenant form
    FE->>API: POST /superadmin/tenants
    API->>DB: Check email + slug uniqueness
    API->>DB: Insert tenant
    API->>DB: Insert admin user (hashed password)
    API->>Email: send_welcome_email (credentials)
    API->>DB: Write audit log (tenant_created)
    API-->>FE: tenant + admin_email + temp_password + email_sent
    Note over FE: Always shows credentials in UI\nregardless of email delivery
```

**Running a Background Check**
```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL
    participant GROQ as Groq AI

    A->>FE: Select applicant + workflow
    FE->>API: POST /instances
    API->>DB: Check no active duplicate instance
    API->>DB: Create WorkflowInstance (in_progress)
    API->>DB: Create WorkflowStepInstances (first=in_progress, rest=pending)
    alt First step is email type
        API->>GROQ: Generate consent email draft
        API->>DB: Save draft to step instance
    end
    API->>DB: Create notification + audit log
    API-->>FE: WorkflowInstance with step instances

    A->>FE: Edit draft + click Send
    FE->>API: PATCH /instances/:id/steps/:sid/email-draft
    API->>DB: Save edited draft
    FE->>API: PATCH /instances/:id/steps/:sid {status: completed}
    API->>DB: Mark step completed, advance next step to in_progress
    alt Next step is email type
        API->>GROQ: Auto-generate draft for next step
        API->>DB: Save new draft
    end
    API->>DB: Log to CommunicationLog
    API->>DB: Create notification + audit log
    alt All steps completed
        API->>DB: Mark instance completed
    end
    API-->>FE: Updated WorkflowInstance
```

### Two-tier access model

```
Superadmin (platform level)
  └── Creates tenants + admin accounts
  └── Activates / deactivates tenants
  └── Edits tenant name / slug
  └── Views platform-wide audit log

Admin (tenant level)
  └── Manages applicants
  └── Creates and runs workflows
  └── Invites team members
  └── Views analytics, audit logs, communications
```

### Multi-tenancy

All tenant data is scoped by `tenant_id` at the service layer. No cross-tenant data leakage is possible through the API.

### Data persistence

PostgreSQL data is stored in `./pgdata` (bind mount), so `docker-compose down` does **not** wipe the database. Only `docker-compose down -v` would remove it.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, PostgreSQL, SQLAlchemy (async), Alembic, JWT (access + refresh tokens) |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Zustand |
| **AI** | Groq `llama-3.1-8b-instant` — AI-assisted email draft generation |
| **Email** | Resend — welcome emails, invitation emails, deactivation notices |
| **Infra** | Docker Compose (backend + frontend + postgres) |

---

## Core Features

**Workflow engine**
- Admins build custom multi-step verification workflows (email, manual, identity, document steps)
- Instances are created per applicant; each step tracks status independently
- Duplicate instance prevention (one active instance per applicant per workflow)

**AI email drafting**
- Groq generates professional consent/verification emails for email-type steps
- Drafts are editable; unsaved changes are indicated
- Manual save and auto-save before send

**Team management**
- Admins invite team members (admin role only)
- Deactivate / reactivate members
- Deactivation sends an automated email notification

**Notifications & audit logs**
- Tenant-wide notifications for key workflow events
- Full audit trail of all actions (applicant CRUD, workflow events, user actions)

**Superadmin panel** (`/superadmin`)
- Create tenants with auto-generated or custom admin password
- Credentials always displayed in UI after creation; email sent via Resend
- Edit tenant name / slug
- Activate / deactivate tenants
- Platform-wide audit log (tenant created/enabled/disabled, superadmin logins)

**Analytics**
- Active / completed / failed instance counts
- Instance trend over time
- Step completion rates

---

## Environment Variables

**Backend (`.env`)**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL async URL, e.g. `postgresql+asyncpg://user:pass@localhost/db` |
| `SECRET_KEY` | JWT signing secret (use a long random string) |
| `GROQ_API_KEY` | Groq API key for AI email drafting |
| `GROQ_MODEL` | Groq model (default: `llama-3.1-8b-instant`) |
| `RESEND_API_KEY` | Resend API key for transactional email |

> **Resend note:** The default sender `onboarding@resend.dev` can only deliver to the Resend account owner's email on the free tier. To send to any address, verify a custom domain at [resend.com/domains](https://resend.com/domains) and update the `from` field in `backend/app/services/email_service.py`.

---

## API Reference

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | — | Login, returns access + refresh tokens |
| POST | `/refresh` | — | Refresh access token |
| GET | `/me` | Any | Current user profile |
| GET | `/users` | Any | List all users in tenant |
| POST | `/invite` | Admin | Invite a new team member |
| PATCH | `/users/:id` | Admin | Activate / deactivate a user |

### Applicants (`/api/v1/applicants`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Any | List applicants (paginated) |
| POST | `` | Admin | Create applicant |
| GET | `/:id` | Any | Get applicant |
| PATCH | `/:id` | Admin | Update applicant |
| DELETE | `/:id` | Admin | Delete applicant |

### Workflows (`/api/v1/workflows`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Any | List workflows |
| POST | `` | Admin | Create workflow |
| GET | `/:id` | Any | Get workflow + steps |
| PATCH | `/:id` | Admin | Update workflow |
| DELETE | `/:id` | Admin | Delete workflow |

### Instances (`/api/v1/instances`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Any | List instances (paginated) |
| POST | `` | Admin | Start a new instance |
| GET | `/:id` | Any | Get instance + step instances |
| PATCH | `/:id/steps/:sid` | Admin | Advance / update a step |
| PATCH | `/:id/steps/:sid/email-draft` | Admin | Save email draft |
| POST | `/:id/steps/:sid/draft-email` | Admin | Regenerate AI email draft |

### Notifications (`/api/v1/notifications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Any | List notifications |
| GET | `/unread-count` | Any | Unread count |
| POST | `/mark-read` | Any | Mark selected as read |
| POST | `/mark-all-read` | Any | Mark all as read |

### Audit Logs (`/api/v1/audit-logs`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Any | List audit logs (paginated, filterable) |

### Communications (`/api/v1/communications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Any | List communication logs |
| POST | `` | Admin | Log a communication |

### Analytics (`/api/v1/analytics`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | Any | Overview stats, trends, step rates |

### Superadmin (`/api/v1/superadmin`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | — | Superadmin login |
| GET | `/tenants` | Superadmin | List all tenants |
| POST | `/tenants` | Superadmin | Create tenant + admin account |
| PUT | `/tenants/:id` | Superadmin | Edit tenant name / slug |
| PATCH | `/tenants/:id` | Superadmin | Activate / deactivate tenant |
| GET | `/audit-logs` | Superadmin | Platform-wide audit log |
