from uuid import UUID
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.models.user import User
from app.models.applicant import ApplicantStatus
from app.schemas.applicant import ApplicantCreate, ApplicantUpdate, ApplicantOut
from app.schemas.common import PaginatedResponse
from app.services import applicant_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ApplicantOut])
async def list_applicants(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Annotated[str | None, Query(max_length=100)] = None,
    status: Annotated[ApplicantStatus | None, Query()] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await applicant_service.list_applicants(
        tenant_id=current_user.tenant_id,
        db=db,
        page=page,
        per_page=per_page,
        search=search,
        status_filter=status,
    )


@router.post("", response_model=ApplicantOut, status_code=status.HTTP_201_CREATED)
async def create_applicant(
    data: ApplicantCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await applicant_service.create_applicant(data, current_user.tenant_id, current_user.id, db)


@router.get("/{applicant_id}", response_model=ApplicantOut)
async def get_applicant(
    applicant_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await applicant_service.get_applicant(applicant_id, current_user.tenant_id, db)


@router.patch("/{applicant_id}", response_model=ApplicantOut)
async def update_applicant(
    applicant_id: UUID,
    data: ApplicantUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await applicant_service.update_applicant(applicant_id, data, current_user.tenant_id, current_user.id, db)


@router.delete("/{applicant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_applicant(
    applicant_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await applicant_service.delete_applicant(applicant_id, current_user.tenant_id, current_user.id, db)
