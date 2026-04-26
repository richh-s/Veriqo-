import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class InstanceStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"


class StepInstanceStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    skipped = "skipped"
    failed = "failed"


class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    workflow_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflows.id"), nullable=False)
    applicant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("applicants.id"), nullable=False)
    status: Mapped[InstanceStatus] = mapped_column(SAEnum(InstanceStatus), default=InstanceStatus.pending)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    tenant: Mapped["Tenant"] = relationship("Tenant")
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="instances")
    applicant: Mapped["Applicant"] = relationship("Applicant", back_populates="workflow_instances")
    step_instances: Mapped[list["WorkflowStepInstance"]] = relationship(
        "WorkflowStepInstance", back_populates="instance", order_by="WorkflowStepInstance.created_at",
        cascade="all, delete-orphan"
    )


class WorkflowStepInstance(Base):
    __tablename__ = "workflow_step_instances"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    instance_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflow_instances.id"), nullable=False)
    step_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workflow_steps.id"), nullable=False)
    status: Mapped[StepInstanceStatus] = mapped_column(SAEnum(StepInstanceStatus), default=StepInstanceStatus.pending)
    notes: Mapped[str | None] = mapped_column(Text)
    email_draft: Mapped[str | None] = mapped_column(Text)  # AI-generated email draft for email steps
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    instance: Mapped["WorkflowInstance"] = relationship("WorkflowInstance", back_populates="step_instances")
    step: Mapped["WorkflowStep"] = relationship("WorkflowStep", back_populates="step_instances")
