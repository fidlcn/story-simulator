"""create all tables

Revision ID: 0001_init
Revises:
Create Date: 2026-06-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001_init'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- projects ---
    op.create_table('projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('genre', sa.String(100)),
        sa.Column('tone', sa.String(100)),
        sa.Column('language', sa.String(10), server_default='zh-CN'),
        sa.Column('target_format', sa.String(50), server_default='screenplay'),
        sa.Column('premise', sa.Text),
        sa.Column('current_simulation_id', postgresql.UUID(as_uuid=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
    )

    # --- worlds ---
    op.create_table('worlds',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('premise', sa.Text),
        sa.Column('era', sa.Text),
        sa.Column('geography', sa.Text),
        sa.Column('political_structure', sa.Text),
        sa.Column('economy', sa.Text),
        sa.Column('technology_level', sa.Text),
        sa.Column('magic_or_power_system', sa.Text),
        sa.Column('social_rules', postgresql.JSONB, server_default='[]'),
        sa.Column('cultural_norms', postgresql.JSONB, server_default='[]'),
        sa.Column('current_instability', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- world_facts ---
    op.create_table('world_facts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('world_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worlds.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.Text, nullable=False),
        sa.Column('scope', sa.String(20), server_default='global'),
        sa.Column('status', sa.String(20), server_default='draft'),
        sa.Column('introduced_at_tick', sa.Integer),
        sa.Column('source', sa.String(20), server_default='user'),
        sa.Column('constraints', postgresql.JSONB, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("scope IN ('global','regional','faction','character','local')", name='ck_world_fact_scope'),
        sa.CheckConstraint("status IN ('draft','locked','hidden')", name='ck_world_fact_status'),
        sa.CheckConstraint("source IN ('user','ai','simulation')", name='ck_world_fact_source'),
    )
    op.create_index('idx_world_facts_world_id', 'world_facts', ['world_id'])
    op.create_index('idx_world_facts_status', 'world_facts', ['world_id', 'status'])

    # --- world_beliefs ---
    op.create_table('world_beliefs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('world_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('worlds.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.Text, nullable=False),
        sa.Column('believed_by', postgresql.JSONB, server_default='[]'),
        sa.Column('is_true', sa.Boolean),
        sa.Column('source', sa.String(20), server_default='ai'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- characters ---
    op.create_table('characters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('role_type', sa.String(50)),
        sa.Column('public_identity', sa.Text),
        sa.Column('private_identity', sa.Text),
        sa.Column('backstory', sa.Text),
        sa.Column('public_goal', sa.Text),
        sa.Column('hidden_goal', sa.Text),
        sa.Column('desire', sa.Text),
        sa.Column('fear', sa.Text),
        sa.Column('misbelief', sa.Text),
        sa.Column('moral_boundary', sa.Text),
        sa.Column('personality_traits', postgresql.JSONB, server_default='[]'),
        sa.Column('values', postgresql.JSONB, server_default='[]'),
        sa.Column('constraints', postgresql.JSONB, server_default='[]'),
        sa.Column('active', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_characters_project', 'characters', ['project_id'])

    # --- character_resources ---
    op.create_table('character_resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('quantity', sa.Numeric, server_default='1'),
        sa.Column('constraints', postgresql.JSONB, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- simulations ---
    op.create_table('simulations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200)),
        sa.Column('status', sa.String(20), server_default='draft'),
        sa.Column('current_tick', sa.Integer, server_default='0'),
        sa.Column('parent_simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id')),
        sa.Column('branch_reason', sa.Text),
        sa.Column('config', postgresql.JSONB, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('draft','running','paused','completed','failed')", name='ck_sim_status'),
    )

    # --- simulation_events ---
    op.create_table('simulation_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tick', sa.Integer, nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('summary', sa.Text, nullable=False),
        sa.Column('event_type', sa.String(30), nullable=False),
        sa.Column('participants', postgresql.JSONB, server_default='[]'),
        sa.Column('location', sa.Text),
        sa.Column('causes', postgresql.JSONB, server_default='[]'),
        sa.Column('effects', postgresql.JSONB, server_default='[]'),
        sa.Column('visibility', postgresql.JSONB, server_default='[]'),
        sa.Column('emotional_impact', postgresql.JSONB, server_default='[]'),
        sa.Column('world_state_changes', postgresql.JSONB, server_default='[]'),
        sa.Column('character_state_changes', postgresql.JSONB, server_default='[]'),
        sa.Column('relationship_state_changes', postgresql.JSONB, server_default='[]'),
        sa.Column('locked', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_by', sa.String(20), server_default='agent'),
        sa.Column('consistency_notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("event_type IN ('action','discovery','conflict','relationship_shift','world_change','turning_point','reveal','setback','choice')", name='ck_event_type'),
        sa.CheckConstraint("locked = TRUE", name='ck_event_locked'),
        sa.CheckConstraint("created_by IN ('user','agent','system')", name='ck_event_created_by'),
    )
    op.create_index('idx_events_simulation_tick', 'simulation_events', ['simulation_id', 'tick'])

    # --- relationships ---
    op.create_table('relationships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('character_id_a', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='CASCADE'), nullable=False),
        sa.Column('character_id_b', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='CASCADE'), nullable=False),
        sa.Column('relationship_type', sa.String(50), nullable=False),
        sa.Column('strength', sa.SmallInteger, server_default='50'),
        sa.Column('trust', sa.SmallInteger, server_default='50'),
        sa.Column('description', sa.Text),
        sa.Column('is_public', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('character_id_a', 'character_id_b', name='uq_relationship_pair'),
    )

    # --- factions ---
    op.create_table('factions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('faction_type', sa.String(50)),
        sa.Column('description', sa.Text),
        sa.Column('goals', postgresql.JSONB, server_default='[]'),
        sa.Column('resources', postgresql.JSONB, server_default='{}'),
        sa.Column('territory', sa.Text),
        sa.Column('ideology', sa.Text),
        sa.Column('leader_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id')),
        sa.Column('member_ids', postgresql.JSONB, server_default='[]'),
        sa.Column('active', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- variable_injections ---
    op.create_table('variable_injections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('introduced_at_tick', sa.Integer, nullable=False),
        sa.Column('type', sa.String(30), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('affected_entity_ids', postgresql.JSONB, server_default='[]'),
        sa.Column('constraints', postgresql.JSONB, server_default='[]'),
        sa.Column('intended_pressure', sa.Text),
        sa.Column('created_by', sa.String(20), server_default='user'),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("created_by IN ('user','ai')", name='ck_variable_created_by'),
        sa.CheckConstraint("status IN ('pending','accepted','rejected','applied')", name='ck_variable_status'),
    )

    # --- snapshots ---
    op.create_table('snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tick', sa.Integer, nullable=False),
        sa.Column('snapshot_type', sa.String(20), server_default='full'),
        sa.Column('data', postgresql.JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- character_knowledge ---
    op.create_table('character_knowledge',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='CASCADE'), nullable=False),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('knowledge_type', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('source_event_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulation_events.id')),
        sa.Column('confidence', sa.SmallInteger, server_default='100'),
        sa.Column('learned_at_tick', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("knowledge_type IN ('fact','belief','rumor','misunderstanding')", name='ck_knowledge_type'),
    )

    # --- character_secrets ---
    op.create_table('character_secrets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='CASCADE'), nullable=False),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('known_by', postgresql.JSONB, server_default='[]'),
        sa.Column('impact', sa.Text),
        sa.Column('reveal_conditions', sa.Text),
        sa.Column('revealed', sa.Boolean, server_default='false'),
        sa.Column('revealed_at_tick', sa.Integer),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- character_arc_states ---
    op.create_table('character_arc_states',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id', ondelete='CASCADE'), nullable=False),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('core_belief', sa.Text),
        sa.Column('contradiction', sa.Text),
        sa.Column('wound', sa.Text),
        sa.Column('temptation', sa.Text),
        sa.Column('current_pressure', sa.Text),
        sa.Column('transformation_stage', sa.String(20), server_default='stable'),
        sa.Column('possible_turning_points', postgresql.JSONB, server_default='[]'),
        sa.Column('updated_at_tick', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('character_id', 'simulation_id', name='uq_arc_state'),
    )

    # --- narrative_lenses ---
    op.create_table('narrative_lenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('structure', sa.String(30), nullable=False),
        sa.Column('protagonist_ids', postgresql.JSONB, nullable=False),
        sa.Column('central_question', sa.Text),
        sa.Column('emotional_spine', sa.Text),
        sa.Column('excluded_event_policy', sa.String(20), server_default='summarize'),
        sa.Column('preferred_narrative_structure', sa.String(20), server_default='three_act'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('simulation_id', name='uq_lens_simulation'),
    )

    # --- narrative_beats ---
    op.create_table('narrative_beats',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lens_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('narrative_lenses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('beat_order', sa.Integer, nullable=False),
        sa.Column('beat_type', sa.String(30), nullable=False),
        sa.Column('related_event_ids', postgresql.JSONB, server_default='[]'),
        sa.Column('protagonist_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id'), nullable=False),
        sa.Column('dramatic_purpose', sa.Text),
        sa.Column('summary', sa.Text),
        sa.Column('emotional_turn', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- scenes ---
    op.create_table('scenes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('beat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('narrative_beats.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scene_order', sa.Integer, nullable=False),
        sa.Column('heading', sa.String(500)),
        sa.Column('location', sa.Text),
        sa.Column('time_of_day', sa.String(50)),
        sa.Column('characters', postgresql.JSONB, server_default='[]'),
        sa.Column('scene_goal', sa.Text),
        sa.Column('conflict', sa.Text),
        sa.Column('turn', sa.Text),
        sa.Column('action', sa.Text),
        sa.Column('dialogue', postgresql.JSONB, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- exports ---
    op.create_table('exports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('export_type', sa.String(20), nullable=False),
        sa.Column('format', sa.String(20), nullable=False),
        sa.Column('title', sa.String(500)),
        sa.Column('content', sa.Text),
        sa.Column('file_path', sa.Text),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('error_message', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
    )

    # --- agent_runs ---
    op.create_table('agent_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='SET NULL')),
        sa.Column('agent_type', sa.String(50), nullable=False),
        sa.Column('model', sa.String(100)),
        sa.Column('input_data', postgresql.JSONB),
        sa.Column('output_data', postgresql.JSONB),
        sa.Column('status', sa.String(20), server_default='running'),
        sa.Column('error_message', sa.Text),
        sa.Column('retry_count', sa.Integer, server_default='0'),
        sa.Column('token_usage', postgresql.JSONB),
        sa.Column('duration_ms', sa.Integer),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
    )

    # --- memories ---
    op.create_table('memories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('owner_type', sa.String(20), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('memory_type', sa.String(30), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('importance', sa.SmallInteger, server_default='50'),
        sa.Column('tick', sa.Integer),
        sa.Column('source_event_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('simulation_events.id')),
        sa.Column('visibility', sa.String(20), server_default='public'),
        sa.Column('metadata', postgresql.JSONB, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('memories')
    op.drop_table('agent_runs')
    op.drop_table('exports')
    op.drop_table('scenes')
    op.drop_table('narrative_beats')
    op.drop_table('narrative_lenses')
    op.drop_table('character_arc_states')
    op.drop_table('character_secrets')
    op.drop_table('character_knowledge')
    op.drop_table('snapshots')
    op.drop_table('variable_injections')
    op.drop_table('simulation_events')
    op.drop_table('factions')
    op.drop_table('relationships')
    op.drop_table('character_resources')
    op.drop_table('characters')
    op.drop_table('simulations')
    op.drop_table('world_beliefs')
    op.drop_table('world_facts')
    op.drop_table('worlds')
    op.drop_table('projects')
