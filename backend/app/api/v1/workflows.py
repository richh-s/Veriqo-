from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.models.user import User
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowOut
from app.services import workflow_service

router = APIRouter()


@router.get("", response_model=list[WorkflowOut])
async def list_workflows(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await workflow_service.list_workflows(current_user.tenant_id, db)


@router.post("", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: create a new workflow template with steps."""
    return await workflow_service.create_workflow(data, current_user.tenant_id, db)


@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await workflow_service.get_workflow(workflow_id, current_user.tenant_id, db)


@router.patch("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: UUID,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: update workflow metadata."""
    return await workflow_service.update_workflow(workflow_id, data, current_user.tenant_id, db)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: delete a workflow and its steps."""
    await workflow_service.delete_workflow(workflow_id, current_user.tenant_id, db)
