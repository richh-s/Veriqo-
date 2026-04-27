import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.workflow import Workflow, WorkflowStep
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowOut


async def list_workflows(tenant_id: uuid.UUID, db: AsyncSession) -> list[WorkflowOut]:
    result = await db.execute(
        select(Workflow)
        .where(Workflow.tenant_id == tenant_id)
        .options(selectinload(Workflow.steps))
        .order_by(Workflow.created_at.desc())
    )
    return [WorkflowOut.model_validate(w) for w in result.scalars().all()]


async def get_workflow(workflow_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> WorkflowOut:
    result = await db.execute(
        select(Workflow)
        .where(Workflow.id == workflow_id, Workflow.tenant_id == tenant_id)
        .options(selectinload(Workflow.steps))
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowOut.model_validate(workflow)


async def create_workflow(data: WorkflowCreate, tenant_id: uuid.UUID, db: AsyncSession) -> WorkflowOut:
    workflow = Workflow(tenant_id=tenant_id, name=data.name, description=data.description)
    db.add(workflow)
    await db.flush()

    for step_data in data.steps:
        step = WorkflowStep(workflow_id=workflow.id, **step_data.model_dump())
        db.add(step)

    await db.flush()
    await db.refresh(workflow, ["steps"])
    return WorkflowOut.model_validate(workflow)


async def update_workflow(
    workflow_id: uuid.UUID, data: WorkflowUpdate, tenant_id: uuid.UUID, db: AsyncSession
) -> WorkflowOut:
    result = await db.execute(
        select(Workflow)
        .where(Workflow.id == workflow_id, Workflow.tenant_id == tenant_id)
        .options(selectinload(Workflow.steps))
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(workflow, field, value)

    await db.flush()
    await db.refresh(workflow, ["steps"])
    return WorkflowOut.model_validate(workflow)


async def delete_workflow(workflow_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.tenant_id == tenant_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await db.delete(workflow)
