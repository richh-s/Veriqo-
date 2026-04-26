from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.workflow_instance import InstanceStatus, StepInstanceStatus


class WorkflowInstanceCreate(BaseModel):
    workflow_id: UUID
    applicant_id: UUID


class StepInstanceUpdate(BaseModel):
    status: StepInstanceStatus
    notes: str | None = None


class StepInstanceOut(BaseModel):
    id: UUID
    instance_id: UUID
    step_id: UUID
    status: StepInstanceStatus
    notes: str | None
    email_draft: str | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowInstanceOut(BaseModel):
    id: UUID
    tenant_id: UUID
    workflow_id: UUID
    applicant_id: UUID
    status: InstanceStatus
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    step_instances: list[StepInstanceOut] = []

    model_config = {"from_attributes": True}
