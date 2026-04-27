import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.applicant import Applicant
from app.schemas.applicant import ApplicantCreate, ApplicantUpdate, ApplicantOut


async def list_applicants(tenant_id: uuid.UUID, db: AsyncSession) -> list[ApplicantOut]:
    result = await db.execute(
        select(Applicant)
        .where(Applicant.tenant_id == tenant_id)
        .order_by(Applicant.created_at.desc())
    )
    return [ApplicantOut.model_validate(a) for a in result.scalars().all()]


async def get_applicant(applicant_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> ApplicantOut:
    result = await db.execute(
        select(Applicant).where(Applicant.id == applicant_id, Applicant.tenant_id == tenant_id)
    )
    applicant = result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return ApplicantOut.model_validate(applicant)


async def create_applicant(
    data: ApplicantCreate, tenant_id: uuid.UUID, db: AsyncSession
) -> ApplicantOut:
    applicant = Applicant(tenant_id=tenant_id, **data.model_dump())
    db.add(applicant)
    await db.flush()
    await db.refresh(applicant)
    return ApplicantOut.model_validate(applicant)


async def update_applicant(
    applicant_id: uuid.UUID,
    data: ApplicantUpdate,
    tenant_id: uuid.UUID,
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
    return ApplicantOut.model_validate(applicant)


async def delete_applicant(
    applicant_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> None:
    result = await db.execute(
        select(Applicant).where(Applicant.id == applicant_id, Applicant.tenant_id == tenant_id)
    )
    applicant = result.scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    await db.delete(applicant)
