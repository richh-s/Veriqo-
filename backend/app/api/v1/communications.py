from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.audit_log import AuditAction
from app.schemas.communication_log import CommunicationLogCreate, CommunicationLogOut
from app.schemas.common import PaginatedResponse
from app.services import communication_service, audit_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[CommunicationLogOut])
async def list_communications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    instance_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await communication_service.list_communications(
        tenant_id=current_user.tenant_id,
        db=db,
        instance_id=instance_id,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=CommunicationLogOut, status_code=status.HTTP_201_CREATED)
async def log_communication(
    data: CommunicationLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await communication_service.log_communication(
        data=data,
        tenant_id=current_user.tenant_id,
        logged_by_id=current_user.id,
        db=db,
    )
    await audit_service.log(
        db=db,
        action=AuditAction.communication_logged,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        entity_type="communication_log",
        entity_id=entry.id,
    )
    return entry
