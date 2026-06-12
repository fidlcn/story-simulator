"""Agent Orchestrator — coordinates multi-agent pipelines."""
import uuid
import asyncio
import logging
from typing import Optional

from app.agents.llm_client import LLMClient
from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Orchestrates agent calls for simulation ticks and narrative generation."""

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
        # Lazy-loaded agents (imported here to avoid circular deps)
        self._seed_agent = None
        self._character_agent = None
        self._world_judge = None
        self._conflict_resolver = None
        self._consistency_reviewer = None
        self._narrative_agent = None
        self._screenplay_agent = None
        self._faction_agent = None

    @property
    def seed_agent(self):
        if self._seed_agent is None:
            from app.agents.seed_generation import SeedGenerationAgent
            self._seed_agent = SeedGenerationAgent(self.llm)
        return self._seed_agent

    @property
    def character_agent(self):
        if self._character_agent is None:
            from app.agents.character_agent import CharacterAgentModule
            self._character_agent = CharacterAgentModule(self.llm)
        return self._character_agent

    @property
    def world_judge(self):
        if self._world_judge is None:
            from app.agents.world_judge import WorldJudgeAgent
            self._world_judge = WorldJudgeAgent(self.llm)
        return self._world_judge

    @property
    def conflict_resolver(self):
        if self._conflict_resolver is None:
            from app.agents.conflict_resolver import ConflictResolverAgent
            self._conflict_resolver = ConflictResolverAgent(self.llm)
        return self._conflict_resolver

    @property
    def consistency_reviewer(self):
        if self._consistency_reviewer is None:
            from app.agents.consistency_review import ConsistencyReviewAgent
            self._consistency_reviewer = ConsistencyReviewAgent(self.llm)
        return self._consistency_reviewer

    @property
    def narrative_agent(self):
        if self._narrative_agent is None:
            from app.agents.narrative_reconstruction import NarrativeReconstructionAgent
            self._narrative_agent = NarrativeReconstructionAgent(self.llm)
        return self._narrative_agent

    @property
    def screenplay_agent(self):
        if self._screenplay_agent is None:
            from app.agents.screenplay_formatter import ScreenplayFormatterAgent
            self._screenplay_agent = ScreenplayFormatterAgent(self.llm)
        return self._screenplay_agent

    async def run_character_agents_parallel(
        self, contexts: dict[str, dict]
    ) -> list[dict]:
        """Run character agents in parallel for all active characters."""
        tasks = [
            self.character_agent.run(ctx, simulation_id=None)
            for ctx in contexts.values()
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        intentions = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Character agent {i} failed: {result}")
                continue
            intentions.append(result)
        return intentions
