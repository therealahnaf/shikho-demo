"""add mentor terms and publishing support

Revision ID: 0005_mentor_publishing
Revises: 0004_circle_store
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005_mentor_publishing"
down_revision: Union[str, None] = "0004_circle_store"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create mentor_terms table
    op.create_table(
        "mentor_terms",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weekly_cycle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mentor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("final_rank", sa.Integer(), server_default="1", nullable=False),
        sa.Column("final_points", sa.Integer(), nullable=False),
        sa.Column("selected_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("final_rank = 1", name=op.f("ck_mentor_terms_final_rank")),
        sa.ForeignKeyConstraint(["circle_id"], ["circles.id"], ondelete="CASCADE", name=op.f("fk_mentor_terms_circle_id_circles")),
        sa.ForeignKeyConstraint(["weekly_cycle_id"], ["weekly_cycles.id"], ondelete="CASCADE", name=op.f("fk_mentor_terms_weekly_cycle_id_weekly_cycles")),
        sa.ForeignKeyConstraint(["mentor_user_id"], ["demo_users.id"], ondelete="CASCADE", name=op.f("fk_mentor_terms_mentor_user_id_demo_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_mentor_terms")),
        sa.UniqueConstraint("weekly_cycle_id", name="uq_mentor_terms_weekly_cycle_id"),
    )
    
    # 2. Add mentor_pick_note_id to roadmaps
    op.add_column("roadmaps", sa.Column("mentor_pick_note_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(op.f("fk_roadmaps_mentor_pick_note_id_notes"), "roadmaps", "notes", ["mentor_pick_note_id"], ["id"], ondelete="SET NULL")

    # 3. Update weekly_cycles status check constraint
    op.drop_constraint(op.f("ck_weekly_cycles_status"), "weekly_cycles", type_="check")
    op.create_check_constraint(op.f("ck_weekly_cycles_status"), "weekly_cycles", "status IN ('active', 'archived', 'planned', 'finalized')")

    # 4. Update activity_events event_type check constraint
    op.drop_constraint(op.f("ck_activity_events_event_type"), "activity_events", type_="check")
    op.create_check_constraint(op.f("ck_activity_events_event_type"), "activity_events", "event_type IN ('checkpoint_completed', 'rank_changed', 'member_joined', 'daily_quest_completed', 'streak_increased', 'note_created', 'mentor_selected', 'roadmap_published', 'week_started')")


def downgrade() -> None:
    # 4. Restore activity_events event_type check constraint
    op.execute("DELETE FROM activity_events WHERE event_type IN ('mentor_selected', 'roadmap_published', 'week_started')")
    op.drop_constraint(op.f("ck_activity_events_event_type"), "activity_events", type_="check")
    op.create_check_constraint(op.f("ck_activity_events_event_type"), "activity_events", "event_type IN ('checkpoint_completed', 'rank_changed', 'member_joined', 'daily_quest_completed', 'streak_increased', 'note_created')")

    # 3. Restore weekly_cycles status check constraint
    op.execute("UPDATE weekly_cycles SET status = 'active' WHERE status = 'finalized'")
    op.drop_constraint(op.f("ck_weekly_cycles_status"), "weekly_cycles", type_="check")
    op.create_check_constraint(op.f("ck_weekly_cycles_status"), "weekly_cycles", "status IN ('active', 'archived', 'planned')")

    # 2. Remove mentor_pick_note_id from roadmaps
    op.drop_constraint(op.f("fk_roadmaps_mentor_pick_note_id_notes"), "roadmaps", type_="foreignkey")
    op.drop_column("roadmaps", "mentor_pick_note_id")

    # 1. Drop mentor_terms table
    op.drop_table("mentor_terms")
