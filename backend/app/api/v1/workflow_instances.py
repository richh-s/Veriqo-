from uuid import UUID
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.workflow_instance import InstanceStatus
from app.schemas.workflow_instance import WorkflowInstanceCreate, StepInstanceUpdate, EmailDraftUpdate, WorkflowInstanceOut
from app.schemas.common import PaginatedResponse
from app.services import workflow_instance_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[WorkflowInstanceOut])
async def list_instances(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Annotated[InstanceStatus | None, Query()] = None,
    applicant_id: Annotated[UUID | None, Query()] = None,
    workflow_id: Annotated[UUID | None, Query()] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await workflow_instance_service.list_instances(
        tenant_id=current_user.tenant_id,
        db=db,
        page=page,
        per_page=per_page,
        status_filter=status,
        applicant_id=applicant_id,
        workflow_id=workflow_id,
    )


@router.post("", response_model=WorkflowInstanceOut, status_code=status.HTTP_201_CREATED)
async def create_instance(
    data: WorkflowInstanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await workflow_instance_service.create_instance(data, current_user.tenant_id, current_user.id, db)


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
    return await workflow_instance_service.advance_step(
        instance_id, step_instance_id, data, current_user.tenant_id, current_user.id, db
    )


@router.patch(
    "/{instance_id}/steps/{step_instance_id}/email-draft",
    response_model=WorkflowInstanceOut,
)
async def save_email_draft(
    instance_id: UUID,
    step_instance_id: UUID,
    data: EmailDraftUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await workflow_instance_service.save_email_draft(
        instance_id, step_instance_id, data.draft, current_user.tenant_id, db
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
    return await workflow_instance_service.regenerate_email_draft(
        instance_id, step_instance_id, current_user.tenant_id, db
    )


@router.post(
    "/{instance_id}/steps/{step_instance_id}/send-email",
    response_model=WorkflowInstanceOut,
)
async def send_step_email(
    instance_id: UUID,
    step_instance_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await workflow_instance_service.send_step_email(
        instance_id, step_instance_id, current_user.tenant_id, current_user.id, db
    )
