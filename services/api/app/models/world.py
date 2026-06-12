"""World and WorldFact models."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class World(Base):
    __tablename__ = "worlds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    premise: Mapped[str | None] = mapped_column(Text)
    era: Mapped[str | None] = mapped_column(Text)
    geography: Mapped[str | None] = mapped_column(Text)
    political_structure: Mapped[str | None] = mapped_column(Text)
    economy: Mapped[str | None] = mapped_column(Text)
    technology_level: Mapped[str | None] = mapped_column(Text)
    magic_or_power_system: Mapped[str | None] = mapped_column(Text)
    social_rules: Mapped[dict] = mapped_column(JSONB, default=list)
    cultural_norms: Mapped[dict] = mapped_column(JSONB, default=list)
    current_instability: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="world")
    facts = relationship("WorldFact", back_populates="world", cascade="all, delete-orphan")
    beliefs = relationship("WorldBelief", back_populates="world", cascade="all, delete-orphan")


class WorldFact(Base):
    __tablename__ = "world_facts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    world_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("worlds.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(String(20), default="global")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    introduced_at_tick: Mapped[int | None] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(20), default="user")
    constraints: Mapped[dict] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("scope IN ('global','regional','faction','character','local')", name="ck_world_fact_scope"),
        CheckConstraint("status IN ('draft','locked','hidden')", name="ck_world_fact_status"),
        CheckConstraint("source IN ('user','ai','simulation')", name="ck_world_fact_source"),
    )

    world = relationship("World", back_populates="facts")


class WorldBelief(Base):
    __tablename__ = "world_beliefs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    world_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("worlds.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    believed_by: Mapped[dict] = mapped_column(JSONB, default=list)
    is_true: Mapped[bool | None]
    source: Mapped[str] = mapped_column(String(20), default="ai")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    world = relationship("World", back_populates="beliefs")
