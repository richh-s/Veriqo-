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
