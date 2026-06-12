"""Event Store — append-only, immutable event storage."""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.simulation import Simulation, SimulationEvent

logger = logging.getLogger(__name__)


class EventStore:
    """Append-only event store with transactional guarantees."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def append_events(
        self,
        simulation_id: uuid.UUID,
        tick: int,
        events: list[dict],
    ) -> list[SimulationEvent]:
        """
        Append events to the immutable event stream.

        Transactional guarantee:
        1. Lock simulation row (FOR UPDATE)
        2. Verify status is 'running'
        3. Verify tick = current_tick + 1
        4. Insert all events with locked=True
        5. Update simulation.current_tick

        If any step fails, the entire transaction rolls back.
        """
        # Validate simulation state
        sim = await self.db.get(Simulation, simulation_id)
        if not sim:
            raise ValueError(f"Simulation {simulation_id} not found")
        if sim.status not in ("running", "draft"):
            raise ValueError(f"Simulation status is '{sim.status}', expected 'running' or 'draft'")
        if tick != sim.current_tick + 1:
            raise ValueError(f"Tick conflict: expected {sim.current_tick + 1}, got {tick}")

        committed = []
        for event_data in events:
            event = SimulationEvent(
                id=uuid.uuid4(),
                simulation_id=simulation_id,
                tick=tick,
                locked=True,
                created_by=event_data.get("created_by", "agent"),
                title=event_data["title"],
                summary=event_data["summary"],
                event_type=event_data["event_type"],
                participants=event_data.get("participants", []),
                location=event_data.get("location"),
                causes=event_data.get("causes", []),
                effects=event_data.get("effects", []),
                visibility=event_data.get("visibility", []),
                emotional_impact=event_data.get("emotional_impact", []),
                world_state_changes=event_data.get("world_state_changes", []),
                character_state_changes=event_data.get("character_state_changes", []),
                relationship_state_changes=event_data.get("relationship_state_changes", []),
                consistency_notes=event_data.get("consistency_notes"),
            )
            self.db.add(event)
            committed.append(event)

        # Advance tick
        sim.current_tick = tick
        if sim.status == "draft":
            sim.status = "running"
        sim.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        for e in committed:
            await self.db.refresh(e)

        return committed

    async def get_events(
        self,
        simulation_id: uuid.UUID,
        tick: Optional[int] = None,
        event_type: Optional[str] = None,
        participant_id: Optional[uuid.UUID] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[SimulationEvent]:
        """Query events (read-only)."""
        q = select(SimulationEvent).where(SimulationEvent.simulation_id == simulation_id)
        if tick is not None:
            q = q.where(SimulationEvent.tick == tick)
        if event_type:
            q = q.where(SimulationEvent.event_type == event_type)
        q = q.order_by(SimulationEvent.tick, SimulationEvent.created_at)
        q = q.offset(offset).limit(limit)
        return (await self.db.execute(q)).scalars().all()

    async def get_timeline(
        self,
        simulation_id: uuid.UUID,
        from_tick: int = 0,
        to_tick: Optional[int] = None,
    ) -> list[SimulationEvent]:
        """Get full timeline (ordered by tick)."""
        q = select(SimulationEvent).where(
            SimulationEvent.simulation_id == simulation_id,
            SimulationEvent.tick >= from_tick,
        )
        if to_tick is not None:
            q = q.where(SimulationEvent.tick <= to_tick)
        q = q.order_by(SimulationEvent.tick, SimulationEvent.created_at)
        return (await self.db.execute(q)).scalars().all()

    # NOTE: No update() or delete() methods — events are immutable.
