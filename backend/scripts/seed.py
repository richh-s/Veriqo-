"""
Demo seed script — run from the backend/ directory:
    python -m scripts.seed

Creates:
  superadmin : super@veriqo.com   / Admin123
  tenant     : Acme Corp
  admin      : admin@acme.com     / Admin123
  clerk      : clerk@acme.com     / Admin123
  3 applicants
  2 workflows (5-step + 3-step)
  1 running instance  (first step in_progress, email draft attached)
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.applicant import Applicant, ApplicantStatus
from app.models.workflow import Workflow, WorkflowStep, StepType
from app.models.workflow_instance import WorkflowInstance, WorkflowStepInstance, InstanceStatus, StepInstanceStatus
from app.models.superadmin import SuperAdmin


engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed():
    async with AsyncSessionLocal() as db:
        # ── Superadmin ────────────────────────────────────────────
        existing = await db.execute(select(SuperAdmin).where(SuperAdmin.email == "super@veriqo.com"))
        sa = existing.scalar_one_or_none()
        if not sa:
            sa = SuperAdmin(
                email="super@veriqo.com",
                hashed_password=hash_password("Admin123"),
                full_name="Super Admin",
                is_active=True
            )
            db.add(sa)
            print("✓ Superadmin created: super@veriqo.com / Admin123")
        else:
            sa.hashed_password = hash_password("Admin123")
            sa.is_active = True
            print("✓ Superadmin password reset to: Admin123")
        await db.flush()

        # ── Tenant ────────────────────────────────────────────────
        existing_tenant = await db.execute(select(Tenant).where(Tenant.slug == "acme"))
        tenant = existing_tenant.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(name="Acme Corp", slug="acme")
            db.add(tenant)
            await db.flush()
            print("✓ Tenant created: Acme Corp")
        else:
            print("· Tenant already exists, skipping")

        # ── Admin user ────────────────────────────────────────────
        existing_admin = await db.execute(select(User).where(User.email == "admin@acme.com"))
        admin = existing_admin.scalar_one_or_none()
        if not admin:
            admin = User(
                tenant_id=tenant.id,
                email="admin@acme.com",
                full_name="Alice Admin",
                hashed_password=hash_password("Admin123"),
                role=UserRole.admin,
            )
            db.add(admin)
            await db.flush()
            print("✓ Admin created: admin@acme.com / Admin123")
        else:
            print("· Admin already exists, skipping")

        # ── Second admin (formerly clerk) ─────────────────────────
        existing_bob = await db.execute(select(User).where(User.email == "bob@acme.com"))
        if not existing_bob.scalar_one_or_none():
            bob = User(
                tenant_id=tenant.id,
                email="bob@acme.com",
                full_name="Bob Smith",
                hashed_password=hash_password("Admin123"),
                role=UserRole.admin,
            )
            db.add(bob)
            await db.flush()
            print("✓ Admin created: bob@acme.com / Admin123")
        else:
            print("· Bob already exists, skipping")

        # ── Applicants ────────────────────────────────────────────
        applicant_data = [
            ("Jordan", "Mitchell", "jordan.mitchell@example.com", ApplicantStatus.in_progress),
            ("Casey", "Rivera", "casey.rivera@example.com", ApplicantStatus.pending),
            ("Taylor", "Brooks", "taylor.brooks@example.com", ApplicantStatus.completed),
        ]
        applicants = []
        for first, last, email, status in applicant_data:
            existing_app = await db.execute(select(Applicant).where(Applicant.email == email))
            app = existing_app.scalar_one_or_none()
            if not app:
                app = Applicant(
                    tenant_id=tenant.id,
                    first_name=first,
                    last_name=last,
                    email=email,
                    phone="+1-555-0100",
                    status=status,
                )
                db.add(app)
                await db.flush()
                print(f"✓ Applicant created: {first} {last}")
            else:
                print(f"· Applicant {first} {last} already exists, skipping")
            applicants.append(app)

        # ── Workflow 1: Full Background Check (5 steps) ───────────
        existing_wf1 = await db.execute(
            select(Workflow).where(Workflow.tenant_id == tenant.id, Workflow.name == "Full Background Check")
        )
        wf1 = existing_wf1.scalar_one_or_none()
        if not wf1:
            wf1 = Workflow(
                tenant_id=tenant.id,
                name="Full Background Check",
                description="Complete 5-step verification for new hires",
                is_active=True,
            )
            db.add(wf1)
            await db.flush()

            steps_wf1 = [
                (1, "Send consent email", StepType.email, {"subject": "Background Check Consent"}),
                (2, "ID verification", StepType.manual, {}),
                (3, "Employment history check", StepType.manual, {}),
                (4, "Criminal record check", StepType.manual, {}),
                (5, "Final review", StepType.manual, {}),
            ]
            wf1_steps = []
            for order, name, stype, config in steps_wf1:
                step = WorkflowStep(
                    workflow_id=wf1.id,
                    name=name,
                    step_type=stype,
                    order=order,
                    config=config,
                )
                db.add(step)
                await db.flush()
                wf1_steps.append(step)
            print("✓ Workflow created: Full Background Check (5 steps)")
        else:
            print("· Workflow 'Full Background Check' already exists, skipping")
            result = await db.execute(
                select(WorkflowStep).where(WorkflowStep.workflow_id == wf1.id).order_by(WorkflowStep.order)
            )
            wf1_steps = result.scalars().all()

        # ── Workflow 2: Express Check (3 steps) ───────────────────
        existing_wf2 = await db.execute(
            select(Workflow).where(Workflow.tenant_id == tenant.id, Workflow.name == "Express Check")
        )
        if not existing_wf2.scalar_one_or_none():
            wf2 = Workflow(
                tenant_id=tenant.id,
                name="Express Check",
                description="Fast 3-step check for contractors",
                is_active=True,
            )
            db.add(wf2)
            await db.flush()

            for order, name, stype in [
                (1, "Notify applicant", StepType.email),
                (2, "ID check", StepType.manual),
                (3, "Approval", StepType.manual),
            ]:
                db.add(WorkflowStep(workflow_id=wf2.id, name=name, step_type=stype, order=order, config={}))
            await db.flush()
            print("✓ Workflow created: Express Check (3 steps)")
        else:
            print("· Workflow 'Express Check' already exists, skipping")

        # ── Running instance for applicant[0] ─────────────────────
        existing_inst = await db.execute(
            select(WorkflowInstance).where(
                WorkflowInstance.applicant_id == applicants[0].id,
                WorkflowInstance.tenant_id == tenant.id,
            )
        )
        if not existing_inst.scalar_one_or_none():
            now = datetime.now(timezone.utc)
            instance = WorkflowInstance(
                tenant_id=tenant.id,
                workflow_id=wf1.id,
                applicant_id=applicants[0].id,
                status=InstanceStatus.in_progress,
                started_at=now,
            )
            db.add(instance)
            await db.flush()

            for idx, step in enumerate(wf1_steps):
                si_status = StepInstanceStatus.in_progress if idx == 0 else StepInstanceStatus.pending
                si = WorkflowStepInstance(
                    instance_id=instance.id,
                    step_id=step.id,
                    status=si_status,
                )
                if idx == 0 and step.step_type == StepType.email:
                    si.email_draft = (
                        f"Subject: Background Check Consent – Jordan Mitchell\n\n"
                        f"Dear Jordan,\n\n"
                        f"We are conducting a background check as part of your onboarding with Acme Corp. "
                        f"Please review and sign the attached consent form at your earliest convenience.\n\n"
                        f"Best regards,\nAcme Corp HR Team"
                    )
                db.add(si)
            await db.flush()
            print("✓ Running instance created for Jordan Mitchell (step 1 in progress)")
        else:
            print("· Instance for Jordan Mitchell already exists, skipping")

        await db.commit()
        print("\n🎉 Seed complete!")
        print("\nLogin credentials:")
        print("  Superadmin : super@veriqo.com   / Admin123  → /superadmin/login")
        print("  Admin      : admin@acme.com     / Admin123  → /login")
        print("  Clerk      : clerk@acme.com     / Admin123  → /login")


if __name__ == "__main__":
    asyncio.run(seed())
