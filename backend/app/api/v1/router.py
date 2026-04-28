from fastapi import APIRouter
from app.api.v1 import (
    auth,
    applicants,
    workflows,
    workflow_instances,
    audit_logs,
    communications,
    notifications,
    analytics,
    superadmin,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(applicants.router, prefix="/applicants", tags=["Applicants"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(workflow_instances.router, prefix="/instances", tags=["Instances"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(communications.router, prefix="/communications", tags=["Communications"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(superadmin.router, prefix="/superadmin", tags=["Superadmin"])
