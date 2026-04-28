from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.core.database import get_db
from app.api.deps import get_current_admin
from app.models.user import User
from app.models.audit_log import AuditAction
from app.schemas.audit_log import AuditLogOut
from app.schemas.common import PaginatedResponse
from app.services import audit_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[AuditLogOut])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    action: Annotated[AuditAction | None, Query()] = None,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await audit_service.list_audit_logs(
        tenant_id=current_user.tenant_id,
        db=db,
        page=page,
        per_page=per_page,
        action=action,
    )
