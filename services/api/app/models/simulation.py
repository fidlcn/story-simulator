"""Simulation, SimulationEvent, VariableInjection, Snapshot, Faction models."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    current_tick: Mapped[int] = mapped_column(Integer, default=0)
    parent_simulation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id"))
    branch_reason: Mapped[str | None] = mapped_column(Text)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("status IN ('draft','running','paused','completed','failed')", name="ck_sim_status"),
        Index("ix_simulations_project_created", "project_id", "created_at"),
        Index("ix_simulations_parent", "parent_simulation_id"),
    )

    project = relationship("Project", back_populates="simulations", foreign_keys="[Simulation.project_id]")
    events = relationship("SimulationEvent", back_populates="simulation", cascade="all, delete-orphan")
    variables = relationship("VariableInjection", back_populates="simulation", cascade="all, delete-orphan")
    snapshots = relationship("Snapshot", back_populates="simulation", cascade="all, delete-orphan")
    narrative_lens = relationship("NarrativeLens", back_populates="simulation", uselist=False, cascade="all, delete-orphan")


class SimulationEvent(Base):
    __tablename__ = "simulation_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    tick: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    participants: Mapped[dict] = mapped_column(JSONB, default=list)
    location: Mapped[str | None] = mapped_column(Text)
    causes: Mapped[dict] = mapped_column(JSONB, default=list)
    effects: Mapped[dict] = mapped_column(JSONB, default=list)
    visibility: Mapped[dict] = mapped_column(JSONB, default=list)
    emotional_impact: Mapped[dict] = mapped_column(JSONB, default=list)
    world_state_changes: Mapped[dict] = mapped_column(JSONB, default=list)
    character_state_changes: Mapped[dict] = mapped_column(JSONB, default=list)
    relationship_state_changes: Mapped[dict] = mapped_column(JSONB, default=list)
    locked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[str] = mapped_column(String(20), default="agent")
    consistency_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('action','discovery','conflict','relationship_shift','world_change','turning_point','reveal','setback','choice')",
            name="ck_event_type",
        ),
        CheckConstraint("locked = TRUE", name="ck_event_locked"),
        CheckConstraint("created_by IN ('user','agent','system')", name="ck_event_created_by"),
        Index("ix_events_sim_tick_created", "simulation_id", "tick", "created_at"),
        Index("ix_events_sim_type_tick", "simulation_id", "event_type", "tick"),
        Index("ix_events_participants_gin", "participants", postgresql_using="gin"),
    )

    simulation = relationship("Simulation", back_populates="events")


class VariableInjection(Base):
    __tablename__ = "variable_injections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    introduced_at_tick: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    affected_entity_ids: Mapped[dict] = mapped_column(JSONB, default=list)
    constraints: Mapped[dict] = mapped_column(JSONB, default=list)
    intended_pressure: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(20), default="user")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint(
            "type IN ('new_character','new_faction','external_event','secret','discovery','false_belief','resource_change','environment_change','relationship_pressure','arc_trigger','narrative_preference')",
            name="ck_variable_type",
        ),
        CheckConstraint("created_by IN ('user','ai')", name="ck_variable_created_by"),
        CheckConstraint("status IN ('pending','accepted','rejected','applied')", name="ck_variable_status"),
        Index("ix_variables_sim_status", "simulation_id", "status"),
    )

    simulation = relationship("Simulation", back_populates="variables")


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    tick: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_type: Mapped[str] = mapped_column(String(20), default="full")
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("snapshot_type IN ('full','characters','world','relationships')", name="ck_snapshot_type"),
        Index("ix_snapshots_sim_tick", "simulation_id", "tick"),
    )

    simulation = relationship("Simulation", back_populates="snapshots")


class Faction(Base):
    __tablename__ = "factions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    faction_type: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    goals: Mapped[dict] = mapped_column(JSONB, default=list)
    resources: Mapped[dict] = mapped_column(JSONB, default=dict)
    territory: Mapped[str | None] = mapped_column(Text)
    ideology: Mapped[str | None] = mapped_column(Text)
    leader_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id"))
    member_ids: Mapped[dict] = mapped_column(JSONB, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="factions")
