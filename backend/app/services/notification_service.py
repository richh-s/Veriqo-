import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.notification import Notification
from app.schemas.notification import NotificationOut
from app.schemas.common import PaginatedResponse


async def create_notification(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    message: str,
    user_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> None:
    notif = Notification(
        tenant_id=tenant_id,
        user_id=user_id,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)


async def list_notifications(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    unread_only: bool = False,
) -> PaginatedResponse[NotificationOut]:
    # Notifications are tenant-wide — all users in a tenant see the same alerts
    query = select(Notification).where(Notification.tenant_id == tenant_id)
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(Notification.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = [NotificationOut.model_validate(n) for n in result.scalars().all()]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


async def count_unread(tenant_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).where(
            Notification.tenant_id == tenant_id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    return result.scalar_one()


async def mark_read(
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    notification_ids: list[uuid.UUID],
    db: AsyncSession,
) -> None:
    await db.execute(
        update(Notification)
        .where(
            Notification.tenant_id == tenant_id,
            Notification.id.in_(notification_ids),
        )
        .values(is_read=True)
    )


async def mark_all_read(tenant_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    await db.execute(
        update(Notification)
        .where(
            Notification.tenant_id == tenant_id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
