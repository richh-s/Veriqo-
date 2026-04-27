### CheckFlow — Background Check SaaS Demo

---

## 🚀 Quick Start (2-Minute Demo)

### 🐳 Option A: Docker (Easiest)
Run the entire stack with a single command. This handles the Database, Backend (migrations/seed), and Frontend automatically.

```bash
docker-compose up --build
```
*App will be at `http://localhost:3000`, API at `http://localhost:8000`*

---

### 💻 Option B: Manual Setup
If you prefer running without Docker.

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt

cp .env.example .env       # (Edit .env with your DATABASE_URL / GROQ_API_KEY)
alembic upgrade head
python -m scripts.seed     # Populates demo users, workflows, and applicants
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

### 🔐 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Superadmin** | `super@veriqo.com` | `Admin123` |
| **Admin** | `admin@acme.com` | `Admin123` |
| **Clerk** | `clerk@acme.com` | `Admin123` |

*Superadmin login is at `/superadmin/login`*

---

## Technical Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, PostgreSQL, SQLAlchemy (async), Alembic, JWT |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Zustand |
| **AI** | Groq (`llama3-8b-8192`) for verification email drafting |

---

## Core Features

- **Multi-tenancy:** Full tenant isolation via `tenant_id` scoping in services.
- **Dynamic Workflows:** Admins create custom onboarding paths with ordered steps.
- **Workflow Instances:** Clerks track applicant progress through real-time states.
- **AI-Assisted Emails:** Automatic drafting of professional verification requests via Groq.
- **Audit Logging:** Every state change is tracked for compliance.
- **Analytics Dashboard:** High-level metrics for tenant performance.

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
