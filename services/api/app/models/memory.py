"""Memory model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, SmallInteger, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    owner_type: Mapped[str] = mapped_column(String(20), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    memory_type: Mapped[str] = mapped_column(String(30), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    importance: Mapped[int] = mapped_column(SmallInteger, default=50)
    tick: Mapped[int | None] = mapped_column(Integer)
    source_event_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("simulation_events.id"))
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    # pgvector embedding — MVP stub, nullable
    # embedding: Mapped[dict | None] = mapped_column(JSONB)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("owner_type IN ('world','character','simulation','narrative')", name="ck_memory_owner_type"),
        CheckConstraint(
            "memory_type IN ('world_rule','history','character_knowledge','character_belief','character_misunderstanding','recent_event','causal_chain','unresolved_conflict','unrevealed_secret','foreshadowing','protagonist_perspective','dramatic_arc','selected_event','omitted_event','reveal_order','beat_structure')",
            name="ck_memory_type",
        ),
        CheckConstraint("visibility IN ('public','character_only','system_only')", name="ck_memory_visibility"),
    )
