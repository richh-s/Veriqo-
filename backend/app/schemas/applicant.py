from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from app.models.applicant import ApplicantStatus


class ApplicantCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    address: str | None = None


class ApplicantUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    status: ApplicantStatus | None = None


class ApplicantOut(BaseModel):
    id: UUID
    tenant_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None
    address: str | None
    status: ApplicantStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
