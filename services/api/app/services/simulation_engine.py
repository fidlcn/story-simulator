"""Simulation Engine — orchestrates the tick pipeline."""
import uuid
import logging
from typing import Optional
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession
from app.services.event_store import EventStore
from app.services.context_builder import ContextBuilder
from app.agents.orchestrator import AgentOrchestrator
from app.agents.llm_client import LLMClient
from app.models.simulation import Simulation

logger = logging.getLogger(__name__)


class TickResult(BaseModel):
    """Result of a single simulation tick."""
    tick: int
    events: list[dict] = []
    state_changes: dict = {}
    warnings: list[str] = []
    errors: list[str] = []


class SimulationEngine:
    """
    Core simulation engine.

    Orchestrates the tick pipeline:
    1. Load state
    2. Build contexts
    3. Run character agents (parallel)
    4. Run world judge
    5. Run conflict resolver
    6. Run consistency review
    7. Commit approved events
    8. Apply state changes
    9. Update memories
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.event_store = EventStore(db)
        self.context_builder = ContextBuilder(db)
        self.orchestrator = AgentOrchestrator(LLMClient())

    async def run_tick(self, simulation_id: uuid.UUID) -> TickResult:
        """
        Execute a complete simulation tick.

        Atomic guarantee: either all events commit or nothing changes.
        """
        sim = await self.db.get(Simulation, simulation_id)
        if not sim:
            raise ValueError(f"Simulation {simulation_id} not found")
        if sim.status not in ("running", "draft"):
            raise ValueError(f"Simulation status is '{sim.status}', cannot run tick")

        tick = sim.current_tick + 1
        logger.info(f"Starting tick {tick} for simulation {simulation_id}")

        try:
            # Phase 1: Build character contexts
            logger.info(f"Tick {tick}: Building contexts")
            contexts = await self.context_builder.build_all_character_contexts(simulation_id)

            if not contexts:
                return TickResult(tick=tick, warnings=["No active characters to simulate"])

            # Phase 2: Character agents (parallel)
            logger.info(f"Tick {tick}: Running {len(contexts)} character agents")
            intentions = await self.orchestrator.run_character_agents_parallel(contexts)

            if not intentions:
                return TickResult(tick=tick, warnings=["No intentions generated"])

            # Phase 3: World judge
            logger.info(f"Tick {tick}: Running world judge")
            judge_context = await self.context_builder.build_world_judge_context(simulation_id)
            judge_input = {
                **judge_context,
                "intentions": intentions,
            }
            judgments = await self.orchestrator.world_judge.run(judge_input, simulation_id)

            # Phase 4: Conflict resolver
            logger.info(f"Tick {tick}: Running conflict resolver")
            resolver_input = {
                "judged_intentions": judgments.get("judgments", []),
                "current_tick": tick,
            }
            candidates = await self.orchestrator.conflict_resolver.run(resolver_input, simulation_id)

            candidate_list = candidates.get("candidates", [])
            if not candidate_list:
                return TickResult(tick=tick, warnings=["No event candidates generated"])

            # Phase 5: Consistency review
            logger.info(f"Tick {tick}: Running consistency review")
            review_input = {
                "candidates": candidate_list,
                **judge_context,
            }
            reviews = await self.orchestrator.consistency_reviewer.run(review_input, simulation_id)

            # Phase 6: Select approved events
            approved = []
            for review in reviews.get("reviews", []):
                if review.get("approved", False):
                    # Find matching candidate
                    cid = review.get("candidate_id")
                    for c in candidate_list:
                        if c.get("candidate_id") == cid or cid is None:
                            approved.append(c)
                            break
                elif review.get("revised_candidate"):
                    approved.append(review["revised_candidate"])

            if not approved:
                return TickResult(tick=tick, warnings=["All candidates rejected by consistency review"])

            # Phase 7: Commit events (immutable boundary)
            logger.info(f"Tick {tick}: Committing {len(approved)} events")
            event_dicts = [
                {
                    "title": c.get("title", "Untitled Event"),
                    "summary": c.get("summary", ""),
                    "event_type": c.get("event_type", "action"),
                    "participants": c.get("participants", []),
                    "causes": c.get("causes", []),
                    "effects": c.get("likely_effects", []),
                    "visibility": c.get("visibility", []),
                    "world_state_changes": c.get("state_changes", []),
                    "character_state_changes": [],
                    "relationship_state_changes": [],
                    "created_by": "agent",
                }
                for c in approved
            ]

            committed = await self.event_store.append_events(simulation_id, tick, event_dicts)
            committed_data = [
                {
                    "id": str(e.id),
                    "tick": e.tick,
                    "title": e.title,
                    "event_type": e.event_type,
                    "summary": e.summary,
                }
                for e in committed
            ]

            logger.info(f"Tick {tick}: Complete — {len(committed)} events committed")
            return TickResult(
                tick=tick,
                events=committed_data,
                state_changes={},
                warnings=[],
            )

        except Exception as e:
            logger.error(f"Tick {tick} failed: {e}")
            # Tick failed — no state pollution
            # Transaction will be rolled back by get_db dependency
            raise
