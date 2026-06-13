"""Consistency Review Agent — validates event candidates against locked facts."""
from typing import Type
from pydantic import BaseModel
from app.agents.base_agent import BaseAgent
from app.agents.llm_client import LLMClient


class ConsistencyReviewItem(BaseModel):
    candidate_id: str | None = None
    approved: bool
    issues: list[str] = []
    required_fixes: list[str] = []
    revised_candidate: dict | None = None


class ConsistencyReviewOutput(BaseModel):
    reviews: list[ConsistencyReviewItem]


class ConsistencyReviewAgent(BaseAgent):
    def __init__(self, llm_client: LLMClient):
        super().__init__(llm_client)

    @property
    def agent_name(self) -> str:
        return "consistency_review"

    def get_system_prompt(self) -> str:
        with open("app/agents/prompts/consistency_review.md", "r") as f:
            return f.read()

    def get_output_schema(self) -> Type[BaseModel]:
        return ConsistencyReviewOutput
