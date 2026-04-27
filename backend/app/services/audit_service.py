import uuid
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.audit_log import AuditLog, AuditAction
from app.schemas.audit_log import AuditLogOut
from app.schemas.common import PaginatedResponse


async def log(
    db: AsyncSession,
    action: AuditAction,
    tenant_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_=metadata,
    )
    db.add(entry)


async def list_audit_logs(
    tenant_id: uuid.UUID,
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    action: AuditAction | None = None,
) -> PaginatedResponse[AuditLogOut]:
    query = select(AuditLog).where(AuditLog.tenant_id == tenant_id)
    if action:
        query = query.where(AuditLog.action == action)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = [AuditLogOut.model_validate(r) for r in result.scalars().all()]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )
