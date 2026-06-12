"""Context Builder — builds visible contexts for each agent."""
import uuid
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.world import World, WorldFact
from app.models.character import Character, CharacterKnowledge, CharacterSecret, Relationship
from app.models.simulation import Simulation, SimulationEvent, VariableInjection
from app.models.memory import Memory

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Builds character-visible and agent-specific contexts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_character_context(
        self,
        character_id: uuid.UUID,
        simulation_id: uuid.UUID,
    ) -> dict:
        """
        Build the visible context for a character agent.

        CRITICAL: Only includes information the character knows.
        - Public world facts + facts known to this character
        - Events where character is a participant AND visibility = known/suspected
        - Character's own knowledge, beliefs, misunderstandings
        - Character's secrets
        - Character's relationships
        - Active variables affecting this character
        """
        character = await self.db.get(Character, character_id)

        # World facts visible to this character (public + known hidden)
        facts_q = select(WorldFact).where(
            WorldFact.status.in_(["locked", "draft"]),
        )
        all_facts = (await self.db.execute(facts_q)).scalars().all()
        visible_facts = [f.text for f in all_facts if f.status == "locked" or f.scope == "global"]

        # Events known to this character
        events_q = (
            select(SimulationEvent)
            .where(SimulationEvent.simulation_id == simulation_id)
            .order_by(SimulationEvent.tick.desc())
            .limit(20)
        )
        all_events = (await self.db.execute(events_q)).scalars().all()
        known_events = []
        for event in all_events:
            vis = event.visibility or []
            is_known = any(
                v.get("characterId") == str(character_id) and v.get("visibility") in ("known", "suspected")
                for v in vis
            )
            if is_known or str(character_id) in [str(p) for p in (event.participants or [])]:
                known_events.append({
                    "tick": event.tick,
                    "title": event.title,
                    "summary": event.summary,
                    "event_type": event.event_type,
                })

        # Character knowledge
        knowledge_q = select(CharacterKnowledge).where(
            CharacterKnowledge.character_id == character_id,
            CharacterKnowledge.simulation_id == simulation_id,
        )
        knowledge = (await self.db.execute(knowledge_q)).scalars().all()

        # Character secrets
        secrets_q = select(CharacterSecret).where(
            CharacterSecret.character_id == character_id,
            CharacterSecret.simulation_id == simulation_id,
            CharacterSecret.revealed == False,
        )
        secrets = (await self.db.execute(secrets_q)).scalars().all()

        # Relationships
        rel_q = select(Relationship).where(
            (Relationship.character_id_a == character_id) | (Relationship.character_id_b == character_id),
        )
        relationships = (await self.db.execute(rel_q)).scalars().all()
        rel_data = []
        for r in relationships:
            other_id = r.character_id_b if r.character_id_a == character_id else r.character_id_a
            other_char = await self.db.get(Character, other_id)
            rel_data.append({
                "character_id": str(other_id),
                "name": other_char.name if other_char else "Unknown",
                "type": r.relationship_type,
                "strength": r.strength,
                "trust": r.trust,
            })

        # Active variables
        var_q = select(VariableInjection).where(
            VariableInjection.simulation_id == simulation_id,
            VariableInjection.status == "applied",
        )
        variables = (await self.db.execute(var_q)).scalars().all()
        active_vars = [
            v.description for v in variables
            if str(character_id) in [str(eid) for eid in (v.affected_entity_ids or [])]
        ]

        return {
            "character": {
                "id": str(character.id),
                "name": character.name,
                "public_identity": character.public_identity,
                "private_identity": character.private_identity,
                "public_goal": character.public_goal,
                "hidden_goal": character.hidden_goal,
                "desire": character.desire,
                "fear": character.fear,
                "misbelief": character.misbelief,
                "personality_traits": character.personality_traits,
                "values": character.values,
            },
            "visible_world_facts": visible_facts,
            "known_events": known_events,
            "relationships": rel_data,
            "knowledge": [{"type": k.knowledge_type, "content": k.content} for k in knowledge],
            "secrets": [s.content for s in secrets],
            "active_variables": active_vars,
        }

    async def build_all_character_contexts(
        self,
        simulation_id: uuid.UUID,
    ) -> dict[str, dict]:
        """Build contexts for all active characters in the simulation."""
        sim = await self.db.get(Simulation, simulation_id)
        if not sim:
            return {}

        # Get all active characters in project
        chars_q = select(Character).where(
            Character.project_id == sim.project_id,
            Character.active == True,
        )
        characters = (await self.db.execute(chars_q)).scalars().all()

        contexts = {}
        for char in characters:
            contexts[str(char.id)] = await self.build_character_context(char.id, simulation_id)
        return contexts

    async def build_world_judge_context(
        self,
        simulation_id: uuid.UUID,
    ) -> dict:
        """Build context for the world judge — includes ALL locked facts."""
        sim = await self.db.get(Simulation, simulation_id)
        facts_q = select(WorldFact).where(WorldFact.status == "locked")
        locked_facts = (await self.db.execute(facts_q)).scalars().all()

        recent_q = (
            select(SimulationEvent)
            .where(SimulationEvent.simulation_id == simulation_id)
            .order_by(SimulationEvent.tick.desc())
            .limit(10)
        )
        recent_events = (await self.db.execute(recent_q)).scalars().all()

        return {
            "locked_facts": [f.text for f in locked_facts],
            "recent_events": [
                {"tick": e.tick, "title": e.title, "summary": e.summary}
                for e in recent_events
            ],
        }
