from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, TokenResponse, UserOut, InviteUserRequest
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("100/minute")
async def register(request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.register_tenant(data, db)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("100/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.login(data, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.refresh_token(data, db)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/invite", response_model=UserOut, status_code=201)
async def invite_user(
    data: InviteUserRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.invite_user(data, current_user.tenant_id, current_user.id, db)
