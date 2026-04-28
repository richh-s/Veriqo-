import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.applicant import Applicant
from app.models.workflow import Workflow, StepType
from app.models.workflow_instance import WorkflowInstance, WorkflowStepInstance, InstanceStatus, StepInstanceStatus
from app.models.audit_log import AuditAction
from app.schemas.workflow_instance import WorkflowInstanceCreate, StepInstanceUpdate, WorkflowInstanceOut
from app.schemas.common import PaginatedResponse
from app.services import groq_service, audit_service, notification_service, email_service
from app.models.communication_log import CommunicationLog, Direction


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


async def list_instances(
    tenant_id: uuid.UUID,
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    status_filter: InstanceStatus | None = None,
    applicant_id: uuid.UUID | None = None,
    workflow_id: uuid.UUID | None = None,
) -> PaginatedResponse[WorkflowInstanceOut]:
    query = select(WorkflowInstance).where(WorkflowInstance.tenant_id == tenant_id)

    if status_filter:
        query = query.where(WorkflowInstance.status == status_filter)
    if applicant_id:
        query = query.where(WorkflowInstance.applicant_id == applicant_id)
    if workflow_id:
        query = query.where(WorkflowInstance.workflow_id == workflow_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = (
        query
        .options(selectinload(WorkflowInstance.step_instances))
        .order_by(WorkflowInstance.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    items = [WorkflowInstanceOut.model_validate(i) for i in result.scalars().all()]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


async def get_instance(
    instance_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> WorkflowInstanceOut:
    instance = await _load_instance(instance_id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


async def create_instance(
    data: WorkflowInstanceCreate, tenant_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> WorkflowInstanceOut:
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

    ap_result = await db.execute(
        select(Applicant).where(Applicant.id == data.applicant_id, Applicant.tenant_id == tenant_id)
    )
    applicant = ap_result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    existing = await db.execute(
        select(WorkflowInstance).where(
            WorkflowInstance.tenant_id == tenant_id,
            WorkflowInstance.applicant_id == applicant.id,
            WorkflowInstance.workflow_id == workflow.id,
            WorkflowInstance.status == InstanceStatus.in_progress,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"{applicant.first_name} {applicant.last_name} already has an active instance for this workflow",
        )

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

        if is_first and step.step_type == StepType.email and settings_groq_enabled():
            try:
                draft = await groq_service.draft_verification_email(
                    applicant_name=applicant_name,
                    step_name=step.name,
                    step_config=step.config,
                )
                step_instance.email_draft = draft
            except Exception:
                pass

    await audit_service.log(
        db=db,
        action=AuditAction.instance_created,
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="workflow_instance",
        entity_id=instance.id,
        metadata={"workflow_id": str(workflow.id), "applicant_id": str(applicant.id)},
    )

    await notification_service.create_notification(
        db=db,
        tenant_id=tenant_id,
        message=f"Background check started for {applicant_name} using workflow '{workflow.name}'",
        entity_type="workflow_instance",
        entity_id=instance.id,
    )

    await db.flush()
    instance = await _load_instance(instance.id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


async def advance_step(
    instance_id: uuid.UUID,
    step_instance_id: uuid.UUID,
    data: StepInstanceUpdate,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> WorkflowInstanceOut:
    instance = await _load_instance(instance_id, tenant_id, db)

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

    pending_steps = sorted(
        [si for si in instance.step_instances if si.status == StepInstanceStatus.pending],
        key=lambda si: si.step.order,
    )

    if pending_steps:
        next_step_instance = pending_steps[0]
        next_step_instance.status = StepInstanceStatus.in_progress

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
        all_statuses = {si.status for si in instance.step_instances}
        if StepInstanceStatus.failed in all_statuses:
            instance.status = InstanceStatus.failed
        else:
            instance.status = InstanceStatus.completed
        instance.completed_at = now

        ap_result = await db.execute(select(Applicant).where(Applicant.id == instance.applicant_id))
        applicant = ap_result.scalar_one_or_none()
        applicant_name = f"{applicant.first_name} {applicant.last_name}" if applicant else "applicant"

        final_status = "completed" if instance.status == InstanceStatus.completed else "failed"
        await notification_service.create_notification(
            db=db,
            tenant_id=tenant_id,
            message=f"Background check {final_status} for {applicant_name}",
            entity_type="workflow_instance",
            entity_id=instance.id,
        )

        await audit_service.log(
            db=db,
            action=AuditAction.instance_completed,
            tenant_id=tenant_id,
            user_id=user_id,
            entity_type="workflow_instance",
            entity_id=instance.id,
            metadata={"status": final_status},
        )

    await audit_service.log(
        db=db,
        action=AuditAction.step_advanced,
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="workflow_step_instance",
        entity_id=step_instance_id,
        metadata={"new_status": data.status},
    )

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
    if not settings_groq_enabled():
        raise HTTPException(status_code=400, detail="GROQ_API_KEY is not configured. Add it to your .env to enable AI drafting.")

    ap_result = await db.execute(
        select(Applicant).where(Applicant.id == instance.applicant_id)
    )
    applicant = ap_result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    try:
        draft = await groq_service.draft_verification_email(
            applicant_name=f"{applicant.first_name} {applicant.last_name}",
            step_name=step_instance.step.name,
            step_config=step_instance.step.config,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    step_instance.email_draft = draft
    await db.flush()

    instance = await _load_instance(instance_id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


async def save_email_draft(
    instance_id: uuid.UUID,
    step_instance_id: uuid.UUID,
    draft: str,
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
    step_instance.email_draft = draft
    await db.flush()
    instance = await _load_instance(instance_id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


async def send_step_email(
    instance_id: uuid.UUID,
    step_instance_id: uuid.UUID,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> WorkflowInstanceOut:
    instance = await _load_instance(instance_id, tenant_id, db)

    step_instance = next(
        (si for si in instance.step_instances if si.id == step_instance_id), None
    )
    if not step_instance:
        raise HTTPException(status_code=404, detail="Step instance not found")
    if not step_instance.email_draft:
        raise HTTPException(status_code=400, detail="No email draft to send")

    ap_result = await db.execute(
        select(Applicant).where(Applicant.id == instance.applicant_id)
    )
    applicant = ap_result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    # Extract subject from first line if it starts with "Subject:"
    lines = step_instance.email_draft.strip().splitlines()
    subject = "Background Check — Action Required"
    body = step_instance.email_draft
    if lines and lines[0].lower().startswith("subject:"):
        subject = lines[0][len("subject:"):].strip()
        body = "\n".join(lines[1:]).strip()

    await email_service.send_workflow_email(
        to_email=applicant.email,
        to_name=f"{applicant.first_name} {applicant.last_name}",
        subject=subject,
        body=body,
    )

    # Auto-log to communication log
    comm = CommunicationLog(
        tenant_id=tenant_id,
        instance_id=instance_id,
        step_instance_id=step_instance_id,
        logged_by_id=user_id,
        direction=Direction.sent,
        recipient_email=applicant.email,
        recipient_name=f"{applicant.first_name} {applicant.last_name}",
        subject=subject,
        body=body,
    )
    db.add(comm)
    await db.flush()

    instance = await _load_instance(instance_id, tenant_id, db)
    return WorkflowInstanceOut.model_validate(instance)


def settings_groq_enabled() -> bool:
    from app.core.config import settings
    return bool(settings.GROQ_API_KEY)
