import uuid
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, cast, Integer
from app.models.workflow_instance import WorkflowInstance, WorkflowStepInstance, InstanceStatus, StepInstanceStatus
from app.models.applicant import Applicant
from app.models.workflow import Workflow
from app.models.notification import Notification
from app.schemas.analytics import DashboardStats, InstanceTrend, StepCompletionRate, AnalyticsOverview


async def get_overview(tenant_id: uuid.UUID, db: AsyncSession) -> AnalyticsOverview:
    stats = await _get_stats(tenant_id, db)
    trend = await _get_instance_trend(tenant_id, db)
    step_rates = await _get_step_completion_rates(tenant_id, db)
    return AnalyticsOverview(stats=stats, instance_trend=trend, step_completion_rates=step_rates)


async def _get_stats(tenant_id: uuid.UUID, db: AsyncSession) -> DashboardStats:
    total_applicants = (await db.execute(
        select(func.count()).where(Applicant.tenant_id == tenant_id)
    )).scalar_one()

    total_workflows = (await db.execute(
        select(func.count()).where(Workflow.tenant_id == tenant_id)
    )).scalar_one()

    active_instances = (await db.execute(
        select(func.count()).where(
            WorkflowInstance.tenant_id == tenant_id,
            WorkflowInstance.status == InstanceStatus.in_progress,
        )
    )).scalar_one()

    completed_instances = (await db.execute(
        select(func.count()).where(
            WorkflowInstance.tenant_id == tenant_id,
            WorkflowInstance.status == InstanceStatus.completed,
        )
    )).scalar_one()

    failed_instances = (await db.execute(
        select(func.count()).where(
            WorkflowInstance.tenant_id == tenant_id,
            WorkflowInstance.status == InstanceStatus.failed,
        )
    )).scalar_one()

    pending_notifications = (await db.execute(
        select(func.count()).where(
            Notification.tenant_id == tenant_id,
            Notification.is_read == False,  # noqa: E712
        )
    )).scalar_one()

    return DashboardStats(
        total_applicants=total_applicants,
        total_workflows=total_workflows,
        active_instances=active_instances,
        completed_instances=completed_instances,
        failed_instances=failed_instances,
        pending_notifications=pending_notifications,
    )


async def _get_instance_trend(tenant_id: uuid.UUID, db: AsyncSession) -> list[InstanceTrend]:
    today = date.today()
    start = today - timedelta(days=29)

    result = await db.execute(
        select(
            func.date(WorkflowInstance.created_at).label("day"),
            func.count().label("created"),
        )
        .where(
            WorkflowInstance.tenant_id == tenant_id,
            WorkflowInstance.created_at >= datetime(start.year, start.month, start.day, tzinfo=timezone.utc),
        )
        .group_by(func.date(WorkflowInstance.created_at))
    )
    created_by_day = {row.day: row.created for row in result}

    result2 = await db.execute(
        select(
            func.date(WorkflowInstance.completed_at).label("day"),
            func.count().label("completed"),
        )
        .where(
            WorkflowInstance.tenant_id == tenant_id,
            WorkflowInstance.completed_at != None,  # noqa: E711
            WorkflowInstance.completed_at >= datetime(start.year, start.month, start.day, tzinfo=timezone.utc),
        )
        .group_by(func.date(WorkflowInstance.completed_at))
    )
    completed_by_day = {row.day: row.completed for row in result2}

    trend = []
    for i in range(30):
        day = start + timedelta(days=i)
        trend.append(InstanceTrend(
            date=day,
            created=created_by_day.get(day, 0),
            completed=completed_by_day.get(day, 0),
        ))

    return trend


async def _get_step_completion_rates(
    tenant_id: uuid.UUID, db: AsyncSession
) -> list[StepCompletionRate]:
    from app.models.workflow import WorkflowStep

    result = await db.execute(
        select(
            WorkflowStep.name,
            func.count(WorkflowStepInstance.id).label("total"),
            func.sum(cast(WorkflowStepInstance.status == StepInstanceStatus.completed, Integer)).label("completed"),
            func.sum(cast(WorkflowStepInstance.status == StepInstanceStatus.skipped, Integer)).label("skipped"),
            func.sum(cast(WorkflowStepInstance.status == StepInstanceStatus.failed, Integer)).label("failed"),
        )
        .join(WorkflowStepInstance, WorkflowStepInstance.step_id == WorkflowStep.id)
        .join(WorkflowInstance, WorkflowInstance.id == WorkflowStepInstance.instance_id)
        .where(WorkflowInstance.tenant_id == tenant_id)
        .group_by(WorkflowStep.name)
    )

    rates = []
    for row in result:
        total = row.total or 0
        completed = int(row.completed or 0)
        skipped = int(row.skipped or 0)
        failed = int(row.failed or 0)
        rate = round(completed / total * 100, 1) if total else 0.0
        rates.append(StepCompletionRate(
            step_name=row.name,
            total=total,
            completed=completed,
            skipped=skipped,
            failed=failed,
            completion_rate=rate,
        ))

    return rates
