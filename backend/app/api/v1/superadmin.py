from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_superadmin
from app.models.superadmin import SuperAdmin
from app.schemas.superadmin import SuperAdminLogin, SuperAdminTokenResponse, TenantSummary, TenantToggle
from app.services import superadmin_service

router = APIRouter()


@router.post("/login", response_model=SuperAdminTokenResponse)
async def superadmin_login(
    data: SuperAdminLogin,
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.login(data, db)


@router.get("/tenants", response_model=dict)
async def list_tenants(
    page: int = 1,
    per_page: int = 20,
    current_admin: SuperAdmin = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.list_tenants(db, page=page, per_page=per_page)


@router.patch("/tenants/{tenant_id}", response_model=TenantSummary)
async def toggle_tenant(
    tenant_id: UUID,
    data: TenantToggle,
    current_admin: SuperAdmin = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.set_tenant_active(tenant_id, data.is_active, current_admin.id, db)
