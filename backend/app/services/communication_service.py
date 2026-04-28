import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException
from app.models.communication_log import CommunicationLog
from app.models.workflow_instance import WorkflowInstance
from app.schemas.communication_log import CommunicationLogCreate, CommunicationLogOut
from app.schemas.common import PaginatedResponse


async def log_communication(
    data: CommunicationLogCreate,
    tenant_id: uuid.UUID,
    logged_by_id: uuid.UUID,
    db: AsyncSession,
) -> CommunicationLogOut:
    # Verify instance belongs to this tenant
    result = await db.execute(
        select(WorkflowInstance).where(
            WorkflowInstance.id == data.instance_id,
            WorkflowInstance.tenant_id == tenant_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workflow instance not found")

    entry = CommunicationLog(
        tenant_id=tenant_id,
        logged_by_id=logged_by_id,
        **data.model_dump(),
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return CommunicationLogOut.model_validate(entry)


async def list_communications(
    tenant_id: uuid.UUID,
    db: AsyncSession,
    instance_id: uuid.UUID | None = None,
    page: int = 1,
    per_page: int = 20,
) -> PaginatedResponse[CommunicationLogOut]:
    query = select(CommunicationLog).where(CommunicationLog.tenant_id == tenant_id)
    if instance_id:
        query = query.where(CommunicationLog.instance_id == instance_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(CommunicationLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = [CommunicationLogOut.model_validate(c) for c in result.scalars().all()]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )
