from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview
from app.services import analytics_service

router = APIRouter()


@router.get("", response_model=AnalyticsOverview)
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_overview(current_user.tenant_id, db)
