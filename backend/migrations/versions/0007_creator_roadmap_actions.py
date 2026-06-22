"""add creator roadmap activity types

Revision ID: 0007_creator_roadmap_actions
Revises: 0006_multiple_circles
Create Date: 2026-06-22
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0007_creator_roadmap_actions"
down_revision: Union[str, None] = "0006_multiple_circles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ACTIVITY_TYPES = "('review', 'lesson', 'quiz', 'challenge', 'assignment', 'lab')"


def upgrade() -> None:
    op.execute("ALTER TABLE roadmap_checkpoints DROP CONSTRAINT ck_roadmap_checkpoints_activity_type")
    op.execute(f"ALTER TABLE roadmap_checkpoints ADD CONSTRAINT ck_roadmap_checkpoints_activity_type CHECK (activity_type IN {ACTIVITY_TYPES})")
    op.execute("ALTER TABLE activity_completions DROP CONSTRAINT ck_activity_completions_activity_type")
    op.execute(f"ALTER TABLE activity_completions ADD CONSTRAINT ck_activity_completions_activity_type CHECK (activity_type IN {ACTIVITY_TYPES})")


def downgrade() -> None:
    op.execute("DELETE FROM activity_completions WHERE activity_type IN ('assignment', 'lab')")
    op.execute("DELETE FROM roadmap_checkpoints WHERE activity_type IN ('assignment', 'lab')")
    op.execute("ALTER TABLE activity_completions DROP CONSTRAINT ck_activity_completions_activity_type")
    op.execute("ALTER TABLE activity_completions ADD CONSTRAINT ck_activity_completions_activity_type CHECK (activity_type IN ('review', 'lesson', 'quiz', 'challenge'))")
    op.execute("ALTER TABLE roadmap_checkpoints DROP CONSTRAINT ck_roadmap_checkpoints_activity_type")
    op.execute("ALTER TABLE roadmap_checkpoints ADD CONSTRAINT ck_roadmap_checkpoints_activity_type CHECK (activity_type IN ('review', 'lesson', 'quiz', 'challenge'))")
