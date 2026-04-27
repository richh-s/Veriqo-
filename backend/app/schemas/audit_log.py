from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any
from app.models.audit_log import AuditAction


class AuditLogOut(BaseModel):
    id: UUID
    tenant_id: UUID | None
    user_id: UUID | None
    action: AuditAction
    entity_type: str | None
    entity_id: UUID | None
    metadata_: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}
