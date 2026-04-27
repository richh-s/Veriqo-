import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Direction(str, enum.Enum):
    sent     = "sent"
    received = "received"


class CommunicationLog(Base):
    __tablename__ = "communication_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    instance_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflow_instances.id"), nullable=False, index=True)
    step_instance_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workflow_step_instances.id"), nullable=True)
    logged_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    direction: Mapped[Direction] = mapped_column(SAEnum(Direction), nullable=False)
    recipient_name: Mapped[str | None] = mapped_column(String(255))
    recipient_email: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    logged_by: Mapped["User"] = relationship("User")
