from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from app.models.communication_log import Direction


class CommunicationLogCreate(BaseModel):
    instance_id: UUID
    step_instance_id: UUID | None = None
    direction: Direction
    recipient_name: str | None = None
    recipient_email: EmailStr | None = None
    subject: str
    body: str


class CommunicationLogOut(BaseModel):
    id: UUID
    tenant_id: UUID
    instance_id: UUID
    step_instance_id: UUID | None
    logged_by_id: UUID
    direction: Direction
    recipient_name: str | None
    recipient_email: str | None
    subject: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}
