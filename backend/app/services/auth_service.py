from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.auth import RegisterRequest, LoginRequest, InviteUserRequest, TokenResponse, UserOut
from app.core.security import hash_password, verify_password, create_access_token
import uuid


async def register_tenant(data: RegisterRequest, db: AsyncSession) -> TokenResponse:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    slug_exists = await db.execute(select(Tenant).where(Tenant.slug == data.tenant_slug))
    if slug_exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant slug already taken")

    tenant = Tenant(name=data.tenant_name, slug=data.tenant_slug)
    db.add(tenant)
    await db.flush()

    user = User(
        tenant_id=tenant.id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role="admin",
    )
    db.add(user)
    await db.flush()

    token = create_access_token({"sub": str(user.id), "tenant_id": str(tenant.id), "role": user.role})
    return TokenResponse(access_token=token)


async def login(data: LoginRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    token = create_access_token({"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role})
    return TokenResponse(access_token=token)


async def invite_user(data: InviteUserRequest, tenant_id: uuid.UUID, db: AsyncSession) -> UserOut:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        tenant_id=tenant_id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    await db.flush()
    return UserOut.model_validate(user)
