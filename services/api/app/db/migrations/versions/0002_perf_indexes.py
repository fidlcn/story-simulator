"""add performance indexes

Revision ID: 0002_perf_indexes
Revises: 0001_init
Create Date: 2026-06-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_perf_indexes"
down_revision: Union[str, None] = "0001_init"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    if not _column_exists("exports", "lens_id"):
        op.add_column(
            "exports",
            sa.Column(
                "lens_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("narrative_lenses.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )

    op.execute("CREATE INDEX IF NOT EXISTS ix_simulations_project_created ON simulations (project_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_simulations_parent ON simulations (parent_simulation_id)")

    op.execute("CREATE INDEX IF NOT EXISTS ix_events_sim_tick_created ON simulation_events (simulation_id, tick, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_sim_type_tick ON simulation_events (simulation_id, event_type, tick)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_participants_gin ON simulation_events USING gin (participants)")

    op.execute("CREATE INDEX IF NOT EXISTS ix_variables_sim_status ON variable_injections (simulation_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_snapshots_sim_tick ON snapshots (simulation_id, tick)")

    op.execute("CREATE INDEX IF NOT EXISTS ix_characters_project_active ON characters (project_id, active)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_relationships_project ON relationships (project_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_relationships_char_a ON relationships (character_id_a)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_relationships_char_b ON relationships (character_id_b)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_knowledge_character_sim ON character_knowledge (character_id, simulation_id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_secrets_character_sim_revealed "
        "ON character_secrets (character_id, simulation_id, revealed)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_arc_states_simulation ON character_arc_states (simulation_id)")

    op.execute("CREATE INDEX IF NOT EXISTS ix_world_facts_world_status_scope ON world_facts (world_id, status, scope)")

    op.execute("CREATE INDEX IF NOT EXISTS ix_lenses_simulation_created ON narrative_lenses (simulation_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_beats_lens_order ON narrative_beats (lens_id, beat_order)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_beats_simulation ON narrative_beats (simulation_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scenes_beat_order ON scenes (beat_id, scene_order)")

    op.execute("CREATE INDEX IF NOT EXISTS ix_exports_sim_created ON exports (simulation_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_exports_lens ON exports (lens_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_agent_runs_sim_created ON agent_runs (simulation_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_agent_runs_status_created ON agent_runs (status, created_at)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_agent_runs_status_created")
    op.execute("DROP INDEX IF EXISTS ix_agent_runs_sim_created")
    op.execute("DROP INDEX IF EXISTS ix_exports_lens")
    op.execute("DROP INDEX IF EXISTS ix_exports_sim_created")

    op.execute("DROP INDEX IF EXISTS ix_scenes_beat_order")
    op.execute("DROP INDEX IF EXISTS ix_beats_simulation")
    op.execute("DROP INDEX IF EXISTS ix_beats_lens_order")
    op.execute("DROP INDEX IF EXISTS ix_lenses_simulation_created")

    op.execute("DROP INDEX IF EXISTS ix_world_facts_world_status_scope")

    op.execute("DROP INDEX IF EXISTS ix_arc_states_simulation")
    op.execute("DROP INDEX IF EXISTS ix_secrets_character_sim_revealed")
    op.execute("DROP INDEX IF EXISTS ix_knowledge_character_sim")
    op.execute("DROP INDEX IF EXISTS ix_relationships_char_b")
    op.execute("DROP INDEX IF EXISTS ix_relationships_char_a")
    op.execute("DROP INDEX IF EXISTS ix_relationships_project")
    op.execute("DROP INDEX IF EXISTS ix_characters_project_active")

    op.execute("DROP INDEX IF EXISTS ix_snapshots_sim_tick")
    op.execute("DROP INDEX IF EXISTS ix_variables_sim_status")

    op.execute("DROP INDEX IF EXISTS ix_events_participants_gin")
    op.execute("DROP INDEX IF EXISTS ix_events_sim_type_tick")
    op.execute("DROP INDEX IF EXISTS ix_events_sim_tick_created")

    op.execute("DROP INDEX IF EXISTS ix_simulations_parent")
    op.execute("DROP INDEX IF EXISTS ix_simulations_project_created")

    if _column_exists("exports", "lens_id"):
        op.drop_column("exports", "lens_id")
