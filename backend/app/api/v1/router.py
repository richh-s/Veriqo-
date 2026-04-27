from fastapi import APIRouter
from app.api.v1 import auth, applicants, workflows, workflow_instances

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(applicants.router, prefix="/applicants", tags=["Applicants"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(workflow_instances.router, prefix="/instances", tags=["Instances"])
