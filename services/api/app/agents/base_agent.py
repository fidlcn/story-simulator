"""Base Agent — all agents inherit from this."""
import uuid
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Type
from datetime import datetime, timezone
from pydantic import BaseModel, ValidationError

from app.agents.llm_client import LLMClient
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AgentOutputError(Exception):
    """Agent failed to produce valid output after retries."""
    def __init__(self, agent_name: str, detail: str):
        self.agent_name = agent_name
        self.detail = detail
        super().__init__(f"Agent {agent_name} failed: {detail}")


class BaseAgent(ABC):
    """Abstract base class for all AI agents."""

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
        self.max_retries = settings.LLM_MAX_RETRIES
        self.retry_delay = 2  # seconds

    @property
    @abstractmethod
    def agent_name(self) -> str:
        """Unique name for this agent type."""
        ...

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent."""
        ...

    @abstractmethod
    def get_output_schema(self) -> Type[BaseModel] | None:
        """Return the Pydantic model for structured output, or None for raw text."""
        ...

    def build_user_prompt(self, context: dict) -> str:
        """Build the user prompt from context. Override for custom formatting."""
        import json
        return json.dumps(context, ensure_ascii=False, indent=2)

    async def run(self, context: dict, simulation_id: uuid.UUID | None = None) -> BaseModel | dict:
        """
        Execute the agent with retries and validation.

        Args:
            context: Input data for the agent
            simulation_id: Optional simulation ID for agent_runs logging

        Returns:
            Validated output (Pydantic model or dict)

        Raises:
            AgentOutputError: After max retries exhausted
        """
        system_prompt = self.get_system_prompt()
        user_prompt = self.build_user_prompt(context)
        output_schema = self.get_output_schema()

        for attempt in range(self.max_retries):
            try:
                result = await self.llm.call(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_schema=output_schema,
                )
                return result

            except (ValidationError, ValueError) as e:
                logger.warning(
                    f"[{self.agent_name}] Attempt {attempt + 1}/{self.max_retries} "
                    f"validation failed: {e}"
                )
                if attempt == self.max_retries - 1:
                    raise AgentOutputError(self.agent_name, str(e))
                await asyncio.sleep(self.retry_delay * (attempt + 1))

            except Exception as e:
                logger.error(
                    f"[{self.agent_name}] Attempt {attempt + 1}/{self.max_retries} "
                    f"LLM call failed: {e}"
                )
                if attempt == self.max_retries - 1:
                    raise AgentOutputError(self.agent_name, str(e))
                await asyncio.sleep(self.retry_delay * (attempt + 1))

    async def run_raw(self, context: dict) -> str:
        """Execute the agent and return raw text (for free-text content)."""
        system_prompt = self.get_system_prompt()
        user_prompt = self.build_user_prompt(context)

        for attempt in range(self.max_retries):
            try:
                return await self.llm.call_raw(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise AgentOutputError(self.agent_name, str(e))
                await asyncio.sleep(self.retry_delay * (attempt + 1))
