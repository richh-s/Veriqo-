from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.workflow_instance import WorkflowInstanceCreate, StepInstanceUpdate, WorkflowInstanceOut
from app.services import workflow_instance_service

router = APIRouter()


@router.get("", response_model=list[WorkflowInstanceOut])
async def list_instances(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await workflow_instance_service.list_instances(current_user.tenant_id, db)


@router.post("", response_model=WorkflowInstanceOut, status_code=status.HTTP_201_CREATED)
async def create_instance(
    data: WorkflowInstanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a workflow for an applicant. Auto-drafts email for the first email step."""
    return await workflow_instance_service.create_instance(data, current_user.tenant_id, db)


@router.get("/{instance_id}", response_model=WorkflowInstanceOut)
async def get_instance(
    instance_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await workflow_instance_service.get_instance(instance_id, current_user.tenant_id, db)


@router.patch("/{instance_id}/steps/{step_instance_id}", response_model=WorkflowInstanceOut)
async def advance_step(
    instance_id: UUID,
    step_instance_id: UUID,
    data: StepInstanceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a step's status and auto-advance to the next step."""
    return await workflow_instance_service.advance_step(
        instance_id, step_instance_id, data, current_user.tenant_id, db
    )


@router.post(
    "/{instance_id}/steps/{step_instance_id}/draft-email",
    response_model=WorkflowInstanceOut,
)
async def regenerate_email_draft(
    instance_id: UUID,
    step_instance_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-generate the AI email draft for an email step using Groq."""
    return await workflow_instance_service.regenerate_email_draft(
        instance_id, step_instance_id, current_user.tenant_id, db
    )
