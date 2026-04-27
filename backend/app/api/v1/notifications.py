from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationOut, NotificationMarkRead
from app.schemas.common import PaginatedResponse
from app.services import notification_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[NotificationOut])
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await notification_service.list_notifications(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        db=db,
        page=page,
        per_page=per_page,
        unread_only=unread_only,
    )


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await notification_service.count_unread(current_user.tenant_id, current_user.id, db)
    return {"unread_count": count}


@router.post("/mark-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    data: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await notification_service.mark_read(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        notification_ids=data.notification_ids,
        db=db,
    )


@router.post("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await notification_service.mark_all_read(current_user.tenant_id, current_user.id, db)
