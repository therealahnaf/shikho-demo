"""add simulated activity progress

Revision ID: 0003_simulated_progress
Revises: 0002_circle_dashboard
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003_simulated_progress"
down_revision: Union[str, None] = "0002_circle_dashboard"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_completions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weekly_cycle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("roadmap_checkpoint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activity_type", sa.String(length=20), nullable=False),
        sa.Column("points_awarded", sa.Integer(), nullable=False),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "activity_type IN ('review', 'lesson', 'quiz', 'challenge')",
            name=op.f("ck_activity_completions_activity_type"),
        ),
        sa.CheckConstraint(
            "points_awarded = 30",
            name=op.f("ck_activity_completions_points_awarded"),
        ),
        sa.ForeignKeyConstraint(
            ["circle_id"], ["circles.id"], ondelete="CASCADE",
            name=op.f("fk_activity_completions_circle_id_circles"),
        ),
        sa.ForeignKeyConstraint(
            ["weekly_cycle_id"], ["weekly_cycles.id"], ondelete="CASCADE",
            name=op.f("fk_activity_completions_weekly_cycle_id_weekly_cycles"),
        ),
        sa.ForeignKeyConstraint(
            ["roadmap_checkpoint_id"], ["roadmap_checkpoints.id"], ondelete="CASCADE",
            name=op.f("fk_activity_completions_roadmap_checkpoint_id_roadmap_checkpoints"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["demo_users.id"], ondelete="CASCADE",
            name=op.f("fk_activity_completions_user_id_demo_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_completions")),
        sa.UniqueConstraint(
            "weekly_cycle_id",
            "roadmap_checkpoint_id",
            "user_id",
            name=op.f("uq_activity_completions_cycle_checkpoint_user"),
        ),
    )
    op.create_index(
        "ix_activity_completions_user_cycle",
        "activity_completions",
        ["user_id", "weekly_cycle_id"],
    )

    op.drop_constraint(
        op.f("ck_activity_events_event_type"),
        "activity_events",
        type_="check",
    )
    op.create_check_constraint(
        op.f("ck_activity_events_event_type"),
        "activity_events",
        "event_type IN ('checkpoint_completed', 'rank_changed', 'member_joined', 'daily_quest_completed', 'streak_increased')",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("ck_activity_events_event_type"),
        "activity_events",
        type_="check",
    )
    op.execute(
        "DELETE FROM activity_events WHERE event_type IN ('daily_quest_completed', 'streak_increased')"
    )
    op.create_check_constraint(
        op.f("ck_activity_events_event_type"),
        "activity_events",
        "event_type IN ('checkpoint_completed', 'rank_changed', 'member_joined')",
    )
    op.drop_index(
        "ix_activity_completions_user_cycle", table_name="activity_completions"
    )
    op.drop_table("activity_completions")
