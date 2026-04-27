# CheckFlow

A multi-tenant background check workflow SaaS. Admins define reusable workflows with typed steps; clerks run those workflows against applicants and track step-by-step progress. Email steps get AI-drafted verification emails via Groq.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI + PostgreSQL + SQLAlchemy (async) + Alembic + JWT |
| AI | Groq (`llama3-8b-8192`) |
| Frontend | Next.js 14 (App Router) + Tailwind + shadcn/ui + Zustand |

---

## Project Structure

```
checkflow/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers (thin — delegate to services)
│   │   ├── core/            # Config, DB engine, JWT security
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   └── services/        # All business logic
│   ├── alembic/             # DB migrations
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/                 # Next.js App Router pages
    ├── components/          # Reusable UI components
    ├── lib/                 # API client, auth helpers
    ├── store/               # Zustand state
    └── types/               # Shared TypeScript types
```

---

## Backend Setup

### 1. Prerequisites

- Python 3.11+
- PostgreSQL 15+

### 2. Install dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, GROQ_API_KEY
```

### 4. Create the database

```bash
createdb checkflow
```

### 5. Run migrations

```bash
# Generate the initial migration (first time only)
alembic revision --autogenerate -m "initial"

# Apply migrations
alembic upgrade head
```

### 6. Start the API server

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

---

## Frontend Setup

### 1. Prerequisites

- Node.js 18+

### 2. Install dependencies

```bash
cd frontend
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Start the dev server

```bash
npm run dev
```

App available at: `http://localhost:3000`

---

## Key Concepts

### Multi-tenancy
Every DB query is scoped by `tenant_id` extracted from the JWT. No cross-tenant data leakage is possible at the service layer.

### Roles
| Role | Permissions |
|---|---|
| `admin` | Full access — manage users, create/delete workflows |
| `clerk` | Read workflows, manage applicants, run and advance instances |

### Workflow Lifecycle
1. Admin creates a **Workflow** with ordered **Steps** (types: `email`, `document`, `manual`, `identity`)
2. Clerk starts a **WorkflowInstance** for an applicant → step instances are auto-created
3. The first step is set to `in_progress` immediately
4. If the first step is type `email`, Groq auto-drafts the verification email
5. Clerk advances each step (`completed` / `skipped` / `failed`) → next step activates
6. Instance auto-completes when all steps are resolved

### Groq AI
Set `GROQ_API_KEY` in `.env`. On any `email`-type step becoming active, the service calls Groq to generate a professional verification email draft. The draft is stored on the step instance and editable before sending. If the key is absent, email drafting is silently skipped.

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register tenant + admin user |
| POST | `/api/v1/auth/login` | — | Login, get JWT |
| GET | `/api/v1/auth/me` | Any | Current user |
| POST | `/api/v1/auth/invite` | Admin | Invite a clerk |
| GET | `/api/v1/applicants` | Any | List applicants |
| POST | `/api/v1/applicants` | Any | Create applicant |
| GET | `/api/v1/applicants/:id` | Any | Get applicant |
| PATCH | `/api/v1/applicants/:id` | Any | Update applicant |
| DELETE | `/api/v1/applicants/:id` | Any | Delete applicant |
| GET | `/api/v1/workflows` | Any | List workflows |
| POST | `/api/v1/workflows` | Admin | Create workflow |
| GET | `/api/v1/workflows/:id` | Any | Get workflow |
| PATCH | `/api/v1/workflows/:id` | Admin | Update workflow |
| DELETE | `/api/v1/workflows/:id` | Admin | Delete workflow |
| GET | `/api/v1/instances` | Any | List instances |
| POST | `/api/v1/instances` | Any | Start instance |
| GET | `/api/v1/instances/:id` | Any | Get instance |
| PATCH | `/api/v1/instances/:id/steps/:sid` | Any | Advance step |
| POST | `/api/v1/instances/:id/steps/:sid/draft-email` | Any | Re-generate email draft |
