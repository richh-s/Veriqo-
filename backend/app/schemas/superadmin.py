from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime


class SuperAdminLogin(BaseModel):
    email: EmailStr
    password: str


class SuperAdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TenantSummary(BaseModel):
    id: UUID
    name: str
    slug: str
    is_active: bool
    created_at: datetime
    user_count: int = 0
    applicant_count: int = 0

    model_config = {"from_attributes": True}


class TenantToggle(BaseModel):
    is_active: bool


class CreateTenantRequest(BaseModel):
    company_name: str
    slug: str
    admin_email: EmailStr
    admin_full_name: str
    admin_password: str | None = None


class CreateTenantResponse(BaseModel):
    tenant: TenantSummary
    admin_email: str
    temp_password: str


class UpdateTenantRequest(BaseModel):
    name: str | None = None
    slug: str | None = None
