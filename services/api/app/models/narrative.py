"""NarrativeLens, NarrativeBeat, Scene models."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class NarrativeLens(Base):
    __tablename__ = "narrative_lenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    structure: Mapped[str] = mapped_column(String(30), nullable=False)
    protagonist_ids: Mapped[dict] = mapped_column(JSONB, nullable=False)
    central_question: Mapped[str | None] = mapped_column(Text)
    emotional_spine: Mapped[str | None] = mapped_column(Text)
    excluded_event_policy: Mapped[str] = mapped_column(String(20), default="summarize")
    preferred_narrative_structure: Mapped[str] = mapped_column(String(20), default="three_act")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint(
            "structure IN ('single','dual','ensemble_primary','ensemble_rotating','antihero','detective','tragic','villain')",
            name="ck_lens_structure",
        ),
        CheckConstraint(
            "excluded_event_policy IN ('summarize','omit','background','reveal_later')",
            name="ck_lens_policy",
        ),
        CheckConstraint(
            "preferred_narrative_structure IN ('three_act','five_act','hero_journey','kishotenketsu','tv_episode','custom')",
            name="ck_lens_narrative",
        ),
    )

    simulation = relationship("Simulation", back_populates="narrative_lens")
    beats = relationship("NarrativeBeat", back_populates="lens", cascade="all, delete-orphan")


class NarrativeBeat(Base):
    __tablename__ = "narrative_beats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    lens_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("narrative_lenses.id", ondelete="CASCADE"), nullable=False)
    beat_order: Mapped[int] = mapped_column(Integer, nullable=False)
    beat_type: Mapped[str] = mapped_column(String(30), nullable=False)
    related_event_ids: Mapped[dict] = mapped_column(JSONB, default=list)
    protagonist_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=False)
    dramatic_purpose: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    emotional_turn: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint(
            "beat_type IN ('opening_image','inciting_incident','debate','first_turning_point','rising_pressure','midpoint','reversal','crisis','climax','resolution')",
            name="ck_beat_type",
        ),
    )

    lens = relationship("NarrativeLens", back_populates="beats")
    scenes = relationship("Scene", back_populates="beat", cascade="all, delete-orphan")


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    beat_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("narrative_beats.id", ondelete="CASCADE"), nullable=False)
    scene_order: Mapped[int] = mapped_column(Integer, nullable=False)
    heading: Mapped[str | None] = mapped_column(String(500))
    location: Mapped[str | None] = mapped_column(Text)
    time_of_day: Mapped[str | None] = mapped_column(String(50))
    characters: Mapped[dict] = mapped_column(JSONB, default=list)
    scene_goal: Mapped[str | None] = mapped_column(Text)
    conflict: Mapped[str | None] = mapped_column(Text)
    turn: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str | None] = mapped_column(Text)
    dialogue: Mapped[dict] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    beat = relationship("NarrativeBeat", back_populates="scenes")
