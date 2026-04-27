import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException
from app.models.applicant import Applicant, ApplicantStatus
from app.models.audit_log import AuditAction
from app.schemas.applicant import ApplicantCreate, ApplicantUpdate, ApplicantOut
from app.schemas.common import PaginatedResponse
from app.services import audit_service


async def list_applicants(
    tenant_id: uuid.UUID,
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    search: str | None = None,
    status_filter: ApplicantStatus | None = None,
) -> PaginatedResponse[ApplicantOut]:
    query = select(Applicant).where(Applicant.tenant_id == tenant_id, Applicant.deleted_at.is_(None))

    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                Applicant.first_name.ilike(term),
                Applicant.last_name.ilike(term),
                Applicant.email.ilike(term),
            )
        )
    if status_filter:
        query = query.where(Applicant.status == status_filter)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(Applicant.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = [ApplicantOut.model_validate(a) for a in result.scalars().all()]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


async def get_applicant(applicant_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> ApplicantOut:
    result = await db.execute(
        select(Applicant).where(
            Applicant.id == applicant_id,
            Applicant.tenant_id == tenant_id,
            Applicant.deleted_at.is_(None),
        )
    )
    applicant = result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return ApplicantOut.model_validate(applicant)


async def create_applicant(
    data: ApplicantCreate, tenant_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> ApplicantOut:
    applicant = Applicant(tenant_id=tenant_id, **data.model_dump())
    db.add(applicant)
    await db.flush()
    await db.refresh(applicant)

    await audit_service.log(
        db=db,
        action=AuditAction.applicant_created,
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="applicant",
        entity_id=applicant.id,
    )

    return ApplicantOut.model_validate(applicant)


async def update_applicant(
    applicant_id: uuid.UUID,
    data: ApplicantUpdate,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> ApplicantOut:
    result = await db.execute(
        select(Applicant).where(Applicant.id == applicant_id, Applicant.tenant_id == tenant_id)
    )
    applicant = result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(applicant, field, value)

    await db.flush()
    await db.refresh(applicant)

    await audit_service.log(
        db=db,
        action=AuditAction.applicant_updated,
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="applicant",
        entity_id=applicant_id,
    )

    return ApplicantOut.model_validate(applicant)


async def delete_applicant(
    applicant_id: uuid.UUID, tenant_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> None:
    result = await db.execute(
        select(Applicant).where(
            Applicant.id == applicant_id,
            Applicant.tenant_id == tenant_id,
            Applicant.deleted_at.is_(None),
        )
    )
    applicant = result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    applicant.deleted_at = datetime.now(timezone.utc)
    await db.flush()

    await audit_service.log(
        db=db,
        action=AuditAction.applicant_deleted,
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="applicant",
        entity_id=applicant_id,
    )
