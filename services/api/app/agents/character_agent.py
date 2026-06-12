"""Character Agent — generates character intentions based on visible context."""
from typing import Type
from pydantic import BaseModel, Field
from app.agents.base_agent import BaseAgent
from app.agents.llm_client import LLMClient


class CharacterIntention(BaseModel):
    character_id: str
    tick: int
    intention_type: str = Field(description="One of: seek, avoid, attack, defend, investigate, negotiate, hide, reveal, betray, protect, escape, sacrifice")
    target_entity_id: str | None = None
    description: str
    reason: str
    emotional_state: str
    risk_tolerance: int = Field(50, ge=0, le=100)
    urgency: int = Field(50, ge=0, le=100)
    expected_outcome: str


class CharacterAgentModule(BaseAgent):
    """Character Agent — simulates a single character's decision-making."""

    def __init__(self, llm_client: LLMClient):
        super().__init__(llm_client)

    @property
    def agent_name(self) -> str:
        return "character_agent"

    def get_system_prompt(self) -> str:
        with open("app/agents/prompts/character_agent.md", "r") as f:
            return f.read()

    def get_output_schema(self) -> Type[BaseModel]:
        return CharacterIntention

    def build_user_prompt(self, context: dict) -> str:
        """Format character visible context as the user prompt."""
        import json
        return (
            f"CHARACTER_VISIBLE_CONTEXT:\n"
            f"{json.dumps(context, ensure_ascii=False, indent=2)}\n\n"
            f"Based on the above context, generate this character's next action intention."
        )
