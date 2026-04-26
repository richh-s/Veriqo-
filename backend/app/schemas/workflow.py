from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.workflow import StepType


class WorkflowStepCreate(BaseModel):
    name: str
    step_type: StepType
    order: int
    config: dict | None = None


class WorkflowStepOut(BaseModel):
    id: UUID
    workflow_id: UUID
    name: str
    step_type: StepType
    order: int
    config: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowCreate(BaseModel):
    name: str
    description: str | None = None
    steps: list[WorkflowStepCreate] = []


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class WorkflowOut(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    steps: list[WorkflowStepOut] = []

    model_config = {"from_attributes": True}
