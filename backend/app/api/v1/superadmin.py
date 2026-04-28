from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_superadmin
from app.models.superadmin import SuperAdmin
from app.schemas.superadmin import SuperAdminLogin, SuperAdminTokenResponse, TenantSummary, TenantToggle, CreateTenantRequest, CreateTenantResponse, UpdateTenantRequest
from app.schemas.common import PaginatedResponse
from app.schemas.audit_log import AuditLogOut
from app.services import superadmin_service

router = APIRouter()


@router.post("/login", response_model=SuperAdminTokenResponse)
async def superadmin_login(
    data: SuperAdminLogin,
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.login(data, db)


@router.post("/tenants", response_model=CreateTenantResponse, status_code=201)
async def create_tenant(
    data: CreateTenantRequest,
    current_admin: SuperAdmin = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.create_tenant(data, db)


@router.get("/tenants", response_model=dict)
async def list_tenants(
    page: int = 1,
    per_page: int = 20,
    current_admin: SuperAdmin = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.list_tenants(db, page=page, per_page=per_page)


@router.put("/tenants/{tenant_id}", response_model=TenantSummary)
async def update_tenant(
    tenant_id: UUID,
    data: UpdateTenantRequest,
    current_admin: SuperAdmin = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.update_tenant(tenant_id, data, db)


@router.patch("/tenants/{tenant_id}", response_model=TenantSummary)
async def toggle_tenant(
    tenant_id: UUID,
    data: TenantToggle,
    current_admin: SuperAdmin = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.set_tenant_active(tenant_id, data.is_active, current_admin.id, db)


@router.delete("/tenants/{tenant_id}", status_code=204)
async def delete_tenant(
    tenant_id: UUID,
    current_admin: SuperAdmin = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    await superadmin_service.delete_tenant(tenant_id, db)


@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogOut])
async def list_audit_logs(
    page: int = 1,
    per_page: int = 30,
    current_admin: SuperAdmin = Depends(get_current_superadmin),
    db: AsyncSession = Depends(get_db),
):
    return await superadmin_service.list_superadmin_audit_logs(db, page=page, per_page=per_page)
