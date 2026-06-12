"""Character, CharacterResource, Relationship, CharacterKnowledge, CharacterSecret, CharacterArcState models."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, SmallInteger, Boolean, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, NUMERIC
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    role_type: Mapped[str | None] = mapped_column(String(50))
    public_identity: Mapped[str | None] = mapped_column(Text)
    private_identity: Mapped[str | None] = mapped_column(Text)
    backstory: Mapped[str | None] = mapped_column(Text)
    public_goal: Mapped[str | None] = mapped_column(Text)
    hidden_goal: Mapped[str | None] = mapped_column(Text)
    desire: Mapped[str | None] = mapped_column(Text)
    fear: Mapped[str | None] = mapped_column(Text)
    misbelief: Mapped[str | None] = mapped_column(Text)
    moral_boundary: Mapped[str | None] = mapped_column(Text)
    personality_traits: Mapped[dict] = mapped_column(JSONB, default=list)
    values: Mapped[dict] = mapped_column(JSONB, default=list)
    constraints: Mapped[dict] = mapped_column(JSONB, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="characters")
    resources = relationship("CharacterResource", back_populates="character", cascade="all, delete-orphan")
    knowledge_items = relationship("CharacterKnowledge", back_populates="character", cascade="all, delete-orphan")
    secrets = relationship("CharacterSecret", back_populates="character", cascade="all, delete-orphan")
    arc_states = relationship("CharacterArcState", back_populates="character", cascade="all, delete-orphan")


class CharacterResource(Base):
    __tablename__ = "character_resources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[float] = mapped_column(NUMERIC, default=1)
    constraints: Mapped[dict] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    character = relationship("Character", back_populates="resources")


class Relationship(Base):
    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint("character_id_a", "character_id_b", name="uq_relationship_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    character_id_a: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    character_id_b: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False)
    strength: Mapped[int] = mapped_column(SmallInteger, default=50)
    trust: Mapped[int] = mapped_column(SmallInteger, default=50)
    description: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="relationships_rel")
    char_a = relationship("Character", foreign_keys=[character_id_a])
    char_b = relationship("Character", foreign_keys=[character_id_b])


class CharacterKnowledge(Base):
    __tablename__ = "character_knowledge"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    knowledge_type: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_event_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("simulation_events.id"))
    confidence: Mapped[int] = mapped_column(SmallInteger, default=100)
    learned_at_tick: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("knowledge_type IN ('fact','belief','rumor','misunderstanding')", name="ck_knowledge_type"),
    )

    character = relationship("Character", back_populates="knowledge_items")


class CharacterSecret(Base):
    __tablename__ = "character_secrets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    known_by: Mapped[dict] = mapped_column(JSONB, default=list)
    impact: Mapped[str | None] = mapped_column(Text)
    reveal_conditions: Mapped[str | None] = mapped_column(Text)
    revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    revealed_at_tick: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    character = relationship("Character", back_populates="secrets")


class CharacterArcState(Base):
    __tablename__ = "character_arc_states"
    __table_args__ = (
        UniqueConstraint("character_id", "simulation_id", name="uq_arc_state"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    core_belief: Mapped[str | None] = mapped_column(Text)
    contradiction: Mapped[str | None] = mapped_column(Text)
    wound: Mapped[str | None] = mapped_column(Text)
    temptation: Mapped[str | None] = mapped_column(Text)
    current_pressure: Mapped[str | None] = mapped_column(Text)
    transformation_stage: Mapped[str] = mapped_column(String(20), default="stable")
    possible_turning_points: Mapped[dict] = mapped_column(JSONB, default=list)
    updated_at_tick: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    character = relationship("Character", back_populates="arc_states")
