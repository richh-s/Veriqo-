from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User
from app.models.tenant import Tenant
from app.models.audit_log import AuditAction
from app.schemas.auth import RegisterRequest, LoginRequest, InviteUserRequest, RefreshRequest, TokenResponse, UserOut, UserUpdateRequest, ResetPasswordResponse, ChangePasswordRequest
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.services import audit_service, email_service
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

    await audit_service.log(
        db=db,
        action=AuditAction.user_registered,
        tenant_id=tenant.id,
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
    )

    claims = {"sub": str(user.id), "tenant_id": str(tenant.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(claims),
        refresh_token=create_refresh_token(claims),
    )


async def login(data: LoginRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant or not tenant.is_active:
        raise HTTPException(status_code=403, detail="Tenant account is disabled")

    await audit_service.log(
        db=db,
        action=AuditAction.user_logged_in,
        tenant_id=user.tenant_id,
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
    )

    claims = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(claims),
        refresh_token=create_refresh_token(claims),
    )


async def refresh_token(data: RefreshRequest, db: AsyncSession) -> TokenResponse:
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    role = payload.get("role")
    sub = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    if not sub or not role or not tenant_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed refresh token")

    claims = {"sub": sub, "tenant_id": tenant_id, "role": role}
    return TokenResponse(
        access_token=create_access_token(claims),
        refresh_token=create_refresh_token(claims),
    )


async def update_user(user_id: uuid.UUID, tenant_id: uuid.UUID, data: UserUpdateRequest, db: AsyncSession) -> UserOut:
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    was_active = user.is_active
    user.is_active = data.is_active
    await db.flush()
    if was_active and not data.is_active:
        await email_service.send_deactivation_email(email=user.email, full_name=user.full_name)
    return UserOut.model_validate(user)


async def reset_user_password(
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession,
) -> ResetPasswordResponse:
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    import secrets, string
    chars = string.ascii_letters + string.digits
    while True:
        temp_password = ''.join(secrets.choice(chars) for _ in range(12))
        if any(c.isupper() for c in temp_password) and any(c.isdigit() for c in temp_password):
            break

    user.hashed_password = hash_password(temp_password)
    await db.flush()

    email_sent, email_error = await email_service.send_password_reset_email(
        email=user.email,
        full_name=user.full_name,
        temp_password=temp_password,
    )

    return ResetPasswordResponse(
        email=user.email,
        temp_password=temp_password,
        email_sent=email_sent,
        email_error=email_error,
    )


async def change_own_password(
    user_id: uuid.UUID,
    data: ChangePasswordRequest,
    db: AsyncSession,
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(data.new_password)
    await db.flush()


async def list_users(tenant_id: uuid.UUID, db: AsyncSession) -> list[UserOut]:
    result = await db.execute(
        select(User)
        .where(User.tenant_id == tenant_id)
        .order_by(User.created_at.asc())
    )
    return [UserOut.model_validate(u) for u in result.scalars().all()]


async def invite_user(data: InviteUserRequest, tenant_id: uuid.UUID, inviter_id: uuid.UUID, db: AsyncSession) -> UserOut:
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

    await audit_service.log(
        db=db,
        action=AuditAction.user_invited,
        tenant_id=tenant_id,
        user_id=inviter_id,
        entity_type="user",
        entity_id=user.id,
        metadata={"invited_email": data.email},
    )

    # Send invitation email via Resend
    await email_service.send_invitation_email(
        email=data.email,
        full_name=data.full_name,
        temp_password=data.password,
        role=data.role
    )

    return UserOut.model_validate(user)
