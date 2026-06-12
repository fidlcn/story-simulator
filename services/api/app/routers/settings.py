"""Settings router — runtime LLM configuration."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.core.runtime_config import get_runtime_config, update_runtime_config

router = APIRouter()


class SettingsResponse(BaseModel):
    api_key: str  # masked
    api_base: str
    model: str
    max_tokens: int
    temperature: float


class SettingsUpdate(BaseModel):
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


def _mask_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]


@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    cfg = get_runtime_config()
    return SettingsResponse(
        api_key=_mask_key(cfg.api_key),
        api_base=cfg.api_base,
        model=cfg.model,
        max_tokens=cfg.max_tokens,
        temperature=cfg.temperature,
    )


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(data: SettingsUpdate):
    cfg = update_runtime_config(**data.model_dump(exclude_none=True))
    return SettingsResponse(
        api_key=_mask_key(cfg.api_key),
        api_base=cfg.api_base,
        model=cfg.model,
        max_tokens=cfg.max_tokens,
        temperature=cfg.temperature,
    )
