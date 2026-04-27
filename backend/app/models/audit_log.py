import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AuditAction(str, enum.Enum):
    user_registered      = "user_registered"
    user_logged_in       = "user_logged_in"
    user_invited         = "user_invited"
    applicant_created    = "applicant_created"
    applicant_updated    = "applicant_updated"
    applicant_deleted    = "applicant_deleted"
    workflow_created     = "workflow_created"
    workflow_updated     = "workflow_updated"
    workflow_deleted     = "workflow_deleted"
    instance_created     = "instance_created"
    step_advanced        = "step_advanced"
    instance_completed   = "instance_completed"
    communication_logged = "communication_logged"
    tenant_disabled      = "tenant_disabled"
    tenant_enabled       = "tenant_enabled"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[AuditAction] = mapped_column(SAEnum(AuditAction), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(100))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
