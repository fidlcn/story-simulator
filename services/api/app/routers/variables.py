"""Variables router — variable injection management."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.simulation import Simulation, VariableInjection
from app.schemas.variable import VariableCreate, VariableResponse

router = APIRouter()


@router.post("/simulations/{simulation_id}/variables", response_model=VariableResponse, status_code=201)
async def create_variable(
    simulation_id: uuid.UUID,
    data: VariableCreate,
    db: AsyncSession = Depends(get_db),
):
    sim = await db.get(Simulation, simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    if sim.status not in ("paused", "draft"):
        raise HTTPException(409, "Variables can only be added when simulation is paused or in draft")

    introduced_at = data.introduced_at_tick if data.introduced_at_tick is not None else sim.current_tick
    if introduced_at < sim.current_tick:
        raise HTTPException(422, "Variable cannot affect past ticks")

    variable = VariableInjection(
        simulation_id=simulation_id,
        introduced_at_tick=introduced_at,
        **data.model_dump(exclude={"introduced_at_tick"}),
    )
    db.add(variable)
    await db.flush()
    await db.refresh(variable)
    return variable


@router.get("/simulations/{simulation_id}/variables", response_model=list[VariableResponse])
async def list_variables(
    simulation_id: uuid.UUID,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(VariableInjection).where(VariableInjection.simulation_id == simulation_id)
    if status:
        q = q.where(VariableInjection.status == status)
    return (await db.execute(q)).scalars().all()


@router.post("/simulations/{simulation_id}/variables/{variable_id}/validate")
async def validate_variable(
    simulation_id: uuid.UUID,
    variable_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    variable = await db.get(VariableInjection, variable_id)
    if not variable or variable.simulation_id != simulation_id:
        raise HTTPException(404, "Variable not found")

    sim = await db.get(Simulation, simulation_id)
    issues = []
    if variable.introduced_at_tick < sim.current_tick:
        issues.append("Variable introduced_at_tick is before current tick")
    # TODO: Check against locked facts and past events via ConsistencyReviewAgent
    return {"valid": len(issues) == 0, "issues": issues}


@router.post("/simulations/{simulation_id}/variables/{variable_id}/apply")
async def apply_variable(
    simulation_id: uuid.UUID,
    variable_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    variable = await db.get(VariableInjection, variable_id)
    if not variable or variable.simulation_id != simulation_id:
        raise HTTPException(404, "Variable not found")
    if variable.status != "accepted":
        raise HTTPException(409, f"Variable status is '{variable.status}', must be 'accepted'")
    variable.status = "applied"
    await db.flush()
    return {"status": "applied", "variable_id": str(variable.id)}
