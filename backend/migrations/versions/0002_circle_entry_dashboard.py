"""add circle entry and dashboard data

Revision ID: 0002_circle_dashboard
Revises: 0001_demo_users
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_circle_dashboard"
down_revision: Union[str, None] = "0001_demo_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "demo_users",
        sa.Column(
            "is_seed_fixture",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.create_table(
        "circles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("class_level", sa.String(length=30), nullable=False),
        sa.Column("subject", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_circles")),
        sa.UniqueConstraint(
            "class_level", "subject", name=op.f("uq_circles_class_subject")
        ),
    )

    op.create_table(
        "circle_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weekly_points", sa.Integer(), server_default="0", nullable=False),
        sa.Column("roadmap_position", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "personal_contribution", sa.Integer(), server_default="0", nullable=False
        ),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "weekly_points >= 0", name=op.f("ck_circle_memberships_weekly_points")
        ),
        sa.CheckConstraint(
            "roadmap_position >= 0",
            name=op.f("ck_circle_memberships_roadmap_position"),
        ),
        sa.CheckConstraint(
            "personal_contribution >= 0",
            name=op.f("ck_circle_memberships_personal_contribution"),
        ),
        sa.ForeignKeyConstraint(
            ["circle_id"], ["circles.id"], ondelete="CASCADE", name=op.f("fk_circle_memberships_circle_id_circles")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["demo_users.id"], ondelete="CASCADE", name=op.f("fk_circle_memberships_user_id_demo_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_circle_memberships")),
        sa.UniqueConstraint(
            "circle_id", "user_id", name=op.f("uq_circle_memberships_circle_user")
        ),
    )

    op.create_table(
        "missions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=140), nullable=False),
        sa.Column("target", sa.Integer(), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.CheckConstraint("target > 0", name=op.f("ck_missions_target")),
        sa.CheckConstraint(
            "progress >= 0 AND progress <= target",
            name=op.f("ck_missions_progress"),
        ),
        sa.CheckConstraint(
            "ends_at > starts_at", name=op.f("ck_missions_date_range")
        ),
        sa.CheckConstraint(
            "status IN ('active', 'archived')", name=op.f("ck_missions_status")
        ),
        sa.ForeignKeyConstraint(
            ["circle_id"], ["circles.id"], ondelete="CASCADE", name=op.f("fk_missions_circle_id_circles")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_missions")),
    )
    op.create_index(
        "uq_missions_active_circle",
        "missions",
        ["circle_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "daily_quests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("local_date", sa.Date(), nullable=False),
        sa.Column("title", sa.String(length=140), nullable=False),
        sa.Column("target", sa.Integer(), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("target > 0", name=op.f("ck_daily_quests_target")),
        sa.CheckConstraint(
            "progress >= 0 AND progress <= target",
            name=op.f("ck_daily_quests_progress"),
        ),
        sa.ForeignKeyConstraint(
            ["circle_id"], ["circles.id"], ondelete="CASCADE", name=op.f("fk_daily_quests_circle_id_circles")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_daily_quests")),
        sa.UniqueConstraint(
            "circle_id", "local_date", name=op.f("uq_daily_quests_circle_date")
        ),
    )

    op.create_table(
        "weekly_cycles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.CheckConstraint(
            "week_number BETWEEN 1 AND 53", name=op.f("ck_weekly_cycles_week_number")
        ),
        sa.CheckConstraint(
            "ends_at > starts_at", name=op.f("ck_weekly_cycles_date_range")
        ),
        sa.CheckConstraint(
            "status IN ('active', 'archived', 'planned')",
            name=op.f("ck_weekly_cycles_status"),
        ),
        sa.ForeignKeyConstraint(
            ["circle_id"], ["circles.id"], ondelete="CASCADE", name=op.f("fk_weekly_cycles_circle_id_circles")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_weekly_cycles")),
    )
    op.create_index(
        "uq_weekly_cycles_active_circle",
        "weekly_cycles",
        ["circle_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "roadmaps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weekly_cycle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'published')", name=op.f("ck_roadmaps_status")
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"], ["demo_users.id"], ondelete="SET NULL", name=op.f("fk_roadmaps_created_by_user_id_demo_users")
        ),
        sa.ForeignKeyConstraint(
            ["weekly_cycle_id"], ["weekly_cycles.id"], ondelete="CASCADE", name=op.f("fk_roadmaps_weekly_cycle_id_weekly_cycles")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roadmaps")),
        sa.UniqueConstraint(
            "weekly_cycle_id", name=op.f("uq_roadmaps_weekly_cycle_id")
        ),
    )

    op.create_table(
        "roadmap_checkpoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("roadmap_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("activity_type", sa.String(length=20), nullable=False),
        sa.Column("topic_key", sa.String(length=60), nullable=False),
        sa.CheckConstraint(
            "position >= 0", name=op.f("ck_roadmap_checkpoints_position")
        ),
        sa.CheckConstraint(
            "activity_type IN ('review', 'lesson', 'quiz', 'challenge')",
            name=op.f("ck_roadmap_checkpoints_activity_type"),
        ),
        sa.ForeignKeyConstraint(
            ["roadmap_id"], ["roadmaps.id"], ondelete="CASCADE", name=op.f("fk_roadmap_checkpoints_roadmap_id_roadmaps")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roadmap_checkpoints")),
        sa.UniqueConstraint(
            "roadmap_id", "position", name=op.f("uq_roadmap_checkpoints_roadmap_position")
        ),
    )

    op.create_table(
        "circle_state",
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("streak_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "current_mentor_user_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "streak_days >= 0", name=op.f("ck_circle_state_streak_days")
        ),
        sa.ForeignKeyConstraint(
            ["circle_id"], ["circles.id"], ondelete="CASCADE", name=op.f("fk_circle_state_circle_id_circles")
        ),
        sa.ForeignKeyConstraint(
            ["current_mentor_user_id"], ["demo_users.id"], ondelete="SET NULL", name=op.f("fk_circle_state_current_mentor_user_id_demo_users")
        ),
        sa.PrimaryKeyConstraint("circle_id", name=op.f("pk_circle_state")),
    )

    op.create_table(
        "activity_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("dedupe_key", sa.String(length=160), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "event_type IN ('checkpoint_completed', 'rank_changed', 'member_joined')",
            name=op.f("ck_activity_events_event_type"),
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"], ["demo_users.id"], ondelete="SET NULL", name=op.f("fk_activity_events_actor_user_id_demo_users")
        ),
        sa.ForeignKeyConstraint(
            ["circle_id"], ["circles.id"], ondelete="CASCADE", name=op.f("fk_activity_events_circle_id_circles")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_events")),
        sa.UniqueConstraint("dedupe_key", name=op.f("uq_activity_events_dedupe_key")),
    )
    op.create_index(
        "ix_activity_events_circle_created",
        "activity_events",
        ["circle_id", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_activity_events_circle_created", table_name="activity_events")
    op.drop_table("activity_events")
    op.drop_table("circle_state")
    op.drop_table("roadmap_checkpoints")
    op.drop_table("roadmaps")
    op.drop_index("uq_weekly_cycles_active_circle", table_name="weekly_cycles")
    op.drop_table("weekly_cycles")
    op.drop_table("daily_quests")
    op.drop_index("uq_missions_active_circle", table_name="missions")
    op.drop_table("missions")
    op.drop_table("circle_memberships")
    op.drop_table("circles")
    op.drop_column("demo_users", "is_seed_fixture")

