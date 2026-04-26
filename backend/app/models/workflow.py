import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Integer, JSON, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class StepType(str, enum.Enum):
    email = "email"
    document = "document"
    manual = "manual"
    identity = "identity"


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="workflows")
    steps: Mapped[list["WorkflowStep"]] = relationship(
        "WorkflowStep", back_populates="workflow", order_by="WorkflowStep.order", cascade="all, delete-orphan"
    )
    instances: Mapped[list["WorkflowInstance"]] = relationship("WorkflowInstance", back_populates="workflow")


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflows.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    step_type: Mapped[StepType] = mapped_column(SAEnum(StepType), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    config: Mapped[dict | None] = mapped_column(JSON)  # e.g. {"recipient_email": "...", "subject": "..."}
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="steps")
    step_instances: Mapped[list["WorkflowStepInstance"]] = relationship(
        "WorkflowStepInstance", back_populates="step"
    )
