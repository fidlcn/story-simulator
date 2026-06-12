"""Celery tasks for export generation."""
from app.workers.celery_app import celery_app


@celery_app.task(bind=True)
def generate_export(self, export_id: str, simulation_id: str, export_type: str, format: str):
    """Generate export file (async)."""
    return {"status": "pending", "export_id": export_id}
