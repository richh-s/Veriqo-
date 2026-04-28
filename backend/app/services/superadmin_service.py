import uuid
import secrets
import string
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.models.superadmin import SuperAdmin
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.models.audit_log import AuditAction
from app.schemas.superadmin import SuperAdminLogin, SuperAdminTokenResponse, TenantSummary, CreateTenantRequest
from app.core.security import verify_password, create_access_token, hash_password
from app.services import audit_service, email_service


def _generate_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits
    while True:
        pwd = ''.join(secrets.choice(chars) for _ in range(length))
        if any(c.isupper() for c in pwd) and any(c.isdigit() for c in pwd):
            return pwd


async def login(data: SuperAdminLogin, db: AsyncSession) -> SuperAdminTokenResponse:
    result = await db.execute(select(SuperAdmin).where(SuperAdmin.email == data.email))
    admin = result.scalar_one_or_none()
    if not admin or not verify_password(data.password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    token = create_access_token({"sub": str(admin.id), "role": "superadmin"})
    return SuperAdminTokenResponse(access_token=token)


async def create_tenant(data: CreateTenantRequest, db: AsyncSession) -> TenantSummary:
    slug_exists = await db.execute(select(Tenant).where(Tenant.slug == data.slug))
    if slug_exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already taken")

    email_check = await db.execute(
        select(User, Tenant).join(Tenant, User.tenant_id == Tenant.id).where(User.email == data.admin_email)
    )
    email_row = email_check.first()
    if email_row:
        _, existing_tenant = email_row
        raise HTTPException(
            status_code=400,
            detail=f"Email already registered under '{existing_tenant.name}'"
        )

    tenant = Tenant(name=data.company_name, slug=data.slug)
    db.add(tenant)
    await db.flush()

    temp_password = _generate_password()
    admin = User(
        tenant_id=tenant.id,
        email=data.admin_email,
        full_name=data.admin_full_name,
        hashed_password=hash_password(temp_password),
        role=UserRole.admin,
    )
    db.add(admin)
    await db.flush()

    await email_service.send_welcome_email(
        email=data.admin_email,
        full_name=data.admin_full_name,
        temp_password=temp_password,
        company_name=data.company_name,
    )

    return TenantSummary(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        is_active=tenant.is_active,
        created_at=tenant.created_at,
        user_count=1,
        applicant_count=0,
    )


async def list_tenants(db: AsyncSession, page: int = 1, per_page: int = 20) -> dict:
    count_result = await db.execute(select(func.count()).select_from(Tenant))
    total = count_result.scalar_one()

    result = await db.execute(
        select(Tenant).order_by(Tenant.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )
    tenants = result.scalars().all()

    summaries = []
    for tenant in tenants:
        user_count_result = await db.execute(
            select(func.count()).where(User.tenant_id == tenant.id)
        )
        applicant_count_result = await db.execute(
            select(func.count()).where(Applicant.tenant_id == tenant.id)
        )
        summaries.append(TenantSummary(
            id=tenant.id,
            name=tenant.name,
            slug=tenant.slug,
            is_active=tenant.is_active,
            created_at=tenant.created_at,
            user_count=user_count_result.scalar_one(),
            applicant_count=applicant_count_result.scalar_one(),
        ))

    return {
        "items": summaries,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


async def set_tenant_active(
    tenant_id: uuid.UUID,
    is_active: bool,
    superadmin_id: uuid.UUID,
    db: AsyncSession,
) -> TenantSummary:
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if not is_active:
        active_count_result = await db.execute(
            select(func.count()).where(Tenant.is_active == True)
        )
        if active_count_result.scalar_one() <= 1:
            raise HTTPException(status_code=400, detail="Cannot disable the last active tenant")

    tenant.is_active = is_active
    await db.flush()

    action = AuditAction.tenant_enabled if is_active else AuditAction.tenant_disabled
    await audit_service.log(
        db=db,
        action=action,
        tenant_id=tenant_id,
        entity_type="tenant",
        entity_id=tenant_id,
        metadata={"changed_by_superadmin": str(superadmin_id)},
    )

    user_count_result = await db.execute(select(func.count()).where(User.tenant_id == tenant.id))
    applicant_count_result = await db.execute(select(func.count()).where(Applicant.tenant_id == tenant.id))

    return TenantSummary(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        is_active=tenant.is_active,
        created_at=tenant.created_at,
        user_count=user_count_result.scalar_one(),
        applicant_count=applicant_count_result.scalar_one(),
    )
