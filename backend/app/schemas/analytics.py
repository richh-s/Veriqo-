from pydantic import BaseModel
from datetime import date


class DashboardStats(BaseModel):
    total_applicants: int
    total_workflows: int
    active_instances: int
    completed_instances: int
    failed_instances: int
    pending_notifications: int


class InstanceTrend(BaseModel):
    date: date
    created: int
    completed: int


class StepCompletionRate(BaseModel):
    step_name: str
    total: int
    completed: int
    skipped: int
    failed: int
    completion_rate: float


class AnalyticsOverview(BaseModel):
    stats: DashboardStats
    instance_trend: list[InstanceTrend]
    step_completion_rates: list[StepCompletionRate]
