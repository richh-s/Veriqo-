from pydantic import BaseModel, EmailStr
from uuid import UUID
from app.models.user import UserRole


class TenantCreate(BaseModel):
    name: str
    slug: str


class RegisterRequest(BaseModel):
    tenant_name: str
    tenant_slug: str
    full_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    tenant_id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}


class InviteUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.clerk
