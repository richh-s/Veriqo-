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
        FE["Next.js 14\nApp Router"]
    end

    subgraph Backend["Backend (FastAPI)"]
        API["REST API\n/api/v1/*"]
        AUTH["Auth\nJWT + Refresh"]
        SVC["Services\nBusiness Logic"]
        ALEMBIC["Alembic\nMigrations"]
    end

    subgraph Storage["Storage"]
        PG[("PostgreSQL\n./pgdata")]
    end

    subgraph External["External Services"]
        GROQ["Groq API\nllama-3.1-8b-instant\nEmail Drafting"]
        RESEND["Resend\nTransactional Email"]
    end

    FE -->|"HTTP + Bearer JWT"| API
    API --> AUTH
    AUTH --> SVC
    SVC --> PG
    ALEMBIC --> PG
    SVC -->|"AI draft generation"| GROQ
    SVC -->|"Welcome / invite /\ndeactivation emails"| RESEND
```

### Data Model

```mermaid
erDiagram
    SUPERADMIN {
        uuid id
        string email
        string hashed_password
    }

    TENANT {
        uuid id
        string name
        string slug
        bool is_active
    }

    USER {
        uuid id
        uuid tenant_id
        string email
        string role
        bool is_active
    }

    APPLICANT {
        uuid id
        uuid tenant_id
        string first_name
        string last_name
        string status
    }

    WORKFLOW {
        uuid id
        uuid tenant_id
        string name
        bool is_active
    }

    WORKFLOW_STEP {
        uuid id
        uuid workflow_id
        string name
        string step_type
        int order
    }

    WORKFLOW_INSTANCE {
        uuid id
        uuid tenant_id
        uuid workflow_id
        uuid applicant_id
        string status
    }

    WORKFLOW_STEP_INSTANCE {
        uuid id
        uuid instance_id
        uuid step_id
        string status
        string email_draft
    }

    AUDIT_LOG {
        uuid id
        uuid tenant_id
        string action
        json metadata
    }

    TENANT ||--o{ USER : "has"
    TENANT ||--o{ APPLICANT : "has"
    TENANT ||--o{ WORKFLOW : "has"
    WORKFLOW ||--o{ WORKFLOW_STEP : "has"
    WORKFLOW_INSTANCE }o--|| WORKFLOW : "runs"
    WORKFLOW_INSTANCE }o--|| APPLICANT : "tracks"
    WORKFLOW_INSTANCE ||--o{ WORKFLOW_STEP_INSTANCE : "has"
    WORKFLOW_STEP_INSTANCE }o--|| WORKFLOW_STEP : "mirrors"
    TENANT ||--o{ AUDIT_LOG : "logs"
```

### Request Flow

```mermaid
sequenceDiagram
    actor SA as Superadmin
    actor A as Admin
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Email as Resend

    SA->>FE: Create tenant
    FE->>API: POST /superadmin/tenants
    API->>DB: Insert tenant + admin user
    API->>Email: Send welcome email (credentials)
    API-->>FE: tenant + temp_password + email_sent

    A->>FE: Login
    FE->>API: POST /auth/login
    API->>DB: Verify credentials
    API-->>FE: access_token + refresh_token

    A->>FE: Start background check
    FE->>API: POST /instances
    API->>DB: Create instance + step instances
    API-->>FE: WorkflowInstance

    A->>FE: Advance email step
    FE->>API: POST /instances/:id/steps/:sid/draft-email
    API->>DB: Fetch applicant + workflow context
    API->>Groq: Generate email draft
    API-->>FE: email_draft text
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
