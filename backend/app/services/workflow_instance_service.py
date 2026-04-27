import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.applicant import Applicant
from app.models.workflow import Workflow, StepType
from app.models.workflow_instance import WorkflowInstance, WorkflowStepInstance, InstanceStatus, StepInstanceStatus
from app.schemas.workflow_instance import WorkflowInstanceCreate, StepInstanceUpdate, WorkflowInstanceOut
from app.services import groq_service


async def _load_instance(
    instance_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> WorkflowInstance:
    result = await db.execute(
        select(WorkflowInstance)
        .where(WorkflowInstance.id == instance_id, WorkflowInstance.tenant_id == tenant_id)
        .options(
            selectinload(WorkflowInstance.step_instances).selectinload(WorkflowStepInstance.step)
        )
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    return instance


async def list_instances(tenant_id: uuid.UUID, db: AsyncSession) -> list[WorkflowInstanceOut]:
    result = await db.execute(
        select(WorkflowInstance)
        .where(WorkflowInstance.tenant_id == tenant_id)
        .options(selectinload(WorkflowInstance.step_instances))
        .order_by(WorkflowInstance.created_at.desc())
    )
    return [WorkflowInstanceOut.model_validate(i) for i in result.scalars().all()]


async def get_instance(
    instance_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> WorkflowInstanceOut:
    instance = await _load_instance(instance_id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


async def create_instance(
    data: WorkflowInstanceCreate, tenant_id: uuid.UUID, db: AsyncSession
) -> WorkflowInstanceOut:
    # Validate workflow belongs to this tenant
    wf_result = await db.execute(
        select(Workflow)
        .where(Workflow.id == data.workflow_id, Workflow.tenant_id == tenant_id)
        .options(selectinload(Workflow.steps))
    )
    workflow = wf_result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if not workflow.is_active:
        raise HTTPException(status_code=400, detail="Workflow is inactive")

    # Validate applicant belongs to this tenant
    ap_result = await db.execute(
        select(Applicant).where(Applicant.id == data.applicant_id, Applicant.tenant_id == tenant_id)
    )
    applicant = ap_result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    now = datetime.now(timezone.utc)
    instance = WorkflowInstance(
        tenant_id=tenant_id,
        workflow_id=workflow.id,
        applicant_id=applicant.id,
        status=InstanceStatus.in_progress,
        started_at=now,
    )
    db.add(instance)
    await db.flush()

    sorted_steps = sorted(workflow.steps, key=lambda s: s.order)
    applicant_name = f"{applicant.first_name} {applicant.last_name}"

    for idx, step in enumerate(sorted_steps):
        is_first = idx == 0
        step_instance = WorkflowStepInstance(
            instance_id=instance.id,
            step_id=step.id,
            status=StepInstanceStatus.in_progress if is_first else StepInstanceStatus.pending,
        )
        db.add(step_instance)
        await db.flush()

        # Auto-draft email for the first step if it's an email type
        if is_first and step.step_type == StepType.email and settings_groq_enabled():
            try:
                draft = await groq_service.draft_verification_email(
                    applicant_name=applicant_name,
                    step_name=step.name,
                    step_config=step.config,
                )
                step_instance.email_draft = draft
            except Exception:
                pass  # Non-blocking: email draft is a convenience feature

    await db.flush()
    instance = await _load_instance(instance.id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


async def advance_step(
    instance_id: uuid.UUID,
    step_instance_id: uuid.UUID,
    data: StepInstanceUpdate,
    tenant_id: uuid.UUID,
    db: AsyncSession,
) -> WorkflowInstanceOut:
    instance = await _load_instance(instance_id, tenant_id, db)

    # Find the target step instance
    step_instance = next(
        (si for si in instance.step_instances if si.id == step_instance_id), None
    )
    if not step_instance:
        raise HTTPException(status_code=404, detail="Step instance not found")
    if step_instance.status not in (StepInstanceStatus.in_progress,):
        raise HTTPException(status_code=400, detail="Step is not currently in progress")

    now = datetime.now(timezone.utc)
    step_instance.status = data.status
    step_instance.notes = data.notes
    if data.status in (StepInstanceStatus.completed, StepInstanceStatus.skipped, StepInstanceStatus.failed):
        step_instance.completed_at = now

    # Find and activate the next pending step
    pending_steps = sorted(
        [si for si in instance.step_instances if si.status == StepInstanceStatus.pending],
        key=lambda si: si.step.order,
    )

    if pending_steps:
        next_step_instance = pending_steps[0]
        next_step_instance.status = StepInstanceStatus.in_progress

        # Auto-draft email if the next step is an email type
        if next_step_instance.step.step_type == StepType.email and settings_groq_enabled():
            ap_result = await db.execute(
                select(Applicant).where(Applicant.id == instance.applicant_id)
            )
            applicant = ap_result.scalar_one_or_none()
            if applicant:
                try:
                    draft = await groq_service.draft_verification_email(
                        applicant_name=f"{applicant.first_name} {applicant.last_name}",
                        step_name=next_step_instance.step.name,
                        step_config=next_step_instance.step.config,
                    )
                    next_step_instance.email_draft = draft
                except Exception:
                    pass
    else:
        # All steps done — mark instance complete
        all_statuses = {si.status for si in instance.step_instances}
        if StepInstanceStatus.failed in all_statuses:
            instance.status = InstanceStatus.failed
        else:
            instance.status = InstanceStatus.completed
        instance.completed_at = now

    await db.flush()
    instance = await _load_instance(instance_id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


async def regenerate_email_draft(
    instance_id: uuid.UUID,
    step_instance_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession,
) -> WorkflowInstanceOut:
    instance = await _load_instance(instance_id, tenant_id, db)

    step_instance = next(
        (si for si in instance.step_instances if si.id == step_instance_id), None
    )
    if not step_instance:
        raise HTTPException(status_code=404, detail="Step instance not found")
    if step_instance.step.step_type != StepType.email:
        raise HTTPException(status_code=400, detail="Step is not an email step")

    ap_result = await db.execute(
        select(Applicant).where(Applicant.id == instance.applicant_id)
    )
    applicant = ap_result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    draft = await groq_service.draft_verification_email(
        applicant_name=f"{applicant.first_name} {applicant.last_name}",
        step_name=step_instance.step.name,
        step_config=step_instance.step.config,
    )
    step_instance.email_draft = draft
    await db.flush()

    instance = await _load_instance(instance_id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


def settings_groq_enabled() -> bool:
    from app.core.config import settings
    return bool(settings.GROQ_API_KEY)
