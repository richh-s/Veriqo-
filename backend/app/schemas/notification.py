from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class NotificationOut(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID | None
    message: str
    entity_type: str | None
    entity_id: UUID | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationMarkRead(BaseModel):
    notification_ids: list[UUID]
