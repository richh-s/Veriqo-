"""
Cleanup script — removes duplicate in_progress instances.
Keeps the most recent instance per (applicant_id, workflow_id) pair.

Run with:
    docker exec veriqo-backend python -m scripts.cleanup_duplicates
"""

import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete

from app.core.config import settings
from app.models.workflow_instance import WorkflowInstance, WorkflowStepInstance, InstanceStatus

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def cleanup():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WorkflowInstance)
            .where(WorkflowInstance.status == InstanceStatus.in_progress)
            .order_by(WorkflowInstance.applicant_id, WorkflowInstance.workflow_id, WorkflowInstance.created_at.desc())
        )
        all_instances = result.scalars().all()

        seen = set()
        to_delete = []
        for inst in all_instances:
            key = (inst.applicant_id, inst.workflow_id)
            if key in seen:
                to_delete.append(inst.id)
            else:
                seen.add(key)

        if not to_delete:
            print("No duplicates found.")
            return

        print(f"Found {len(to_delete)} duplicate instance(s) to remove...")

        # Delete step instances first (foreign key)
        await db.execute(
            delete(WorkflowStepInstance).where(WorkflowStepInstance.instance_id.in_(to_delete))
        )
        await db.execute(
            delete(WorkflowInstance).where(WorkflowInstance.id.in_(to_delete))
        )
        await db.commit()
        print(f"Done — removed {len(to_delete)} duplicate instance(s).")


if __name__ == "__main__":
    asyncio.run(cleanup())
