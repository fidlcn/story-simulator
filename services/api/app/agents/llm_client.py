"""LLM Client — structured output via OpenAI API."""
import json
import logging
from typing import Type
from pydantic import BaseModel
from openai import AsyncOpenAI
from app.core.runtime_config import get_runtime_config

logger = logging.getLogger(__name__)


class LLMClient:
    """Async LLM client with structured output support.

    Reads settings from RuntimeConfig so changes via the /api/settings
    endpoint take effect immediately on the next LLMClient instantiation.
    """

    def __init__(self):
        cfg = get_runtime_config()
        kwargs = {"api_key": cfg.api_key}
        if cfg.api_base:
            kwargs["base_url"] = cfg.api_base
        self.client = AsyncOpenAI(**kwargs)
        self.model = cfg.model
        self.max_tokens = cfg.max_tokens
        self.default_temperature = cfg.temperature

    async def call(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: Type[BaseModel] | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict:
        """
        Call LLM and return structured JSON.

        If response_schema is provided, uses JSON mode + schema validation.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or self.default_temperature,
            "max_tokens": max_tokens or self.max_tokens,
        }

        # Use response_format for structured output
        if response_schema:
            schema_json = response_schema.model_json_schema()
            # Append schema instruction to system prompt
            kwargs["messages"][0]["content"] += (
                f"\n\nYou MUST respond with valid JSON matching this schema:\n"
                f"```json\n{json.dumps(schema_json, indent=2)}\n```\n"
                f"Do NOT include any text outside the JSON object."
            )
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content

            # Parse JSON
            parsed = json.loads(content)

            # Validate against schema if provided
            if response_schema:
                validated = response_schema.model_validate(parsed)
                return validated.model_dump()

            return parsed

        except json.JSONDecodeError as e:
            logger.error(f"LLM returned invalid JSON: {e}")
            raise
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise

    async def call_raw(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Call LLM and return raw text (for free-text content like dialogue)."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature or self.default_temperature,
            max_tokens=max_tokens or self.max_tokens,
        )
        return response.choices[0].message.content
