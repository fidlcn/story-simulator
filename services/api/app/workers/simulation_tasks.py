"""Celery tasks for simulation."""
from app.workers.celery_app import celery_app


@celery_app.task(bind=True)
def run_simulation_tick(self, simulation_id: str):
    """Run a single simulation tick (async)."""
    # TODO: Create async DB session, instantiate SimulationEngine, call run_tick
    # For MVP, this is a placeholder that will be wired up with the async engine
    return {"status": "pending", "simulation_id": simulation_id}


@celery_app.task(bind=True)
def generate_seed(self, project_id: str, params: dict):
    """Generate world/character seeds (async)."""
    return {"status": "pending", "project_id": project_id}
