"""add circle store notes

Revision ID: 0004_circle_store
Revises: 0003_simulated_progress
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004_circle_store"
down_revision: Union[str, None] = "0003_simulated_progress"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("circle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("content_type", sa.String(length=10), nullable=False),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("image_bytes", sa.LargeBinary(), nullable=True),
        sa.Column("image_mime_type", sa.String(length=30), nullable=True),
        sa.Column("image_size", sa.Integer(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("category IN ('chapter_1', 'chapter_2', 'formulas', 'revision_notes', 'important_questions')", name=op.f("ck_notes_category")),
        sa.CheckConstraint("content_type IN ('text', 'image')", name=op.f("ck_notes_content_type")),
        sa.CheckConstraint("(content_type = 'text' AND text_content IS NOT NULL AND image_bytes IS NULL AND image_mime_type IS NULL AND image_size IS NULL) OR (content_type = 'image' AND text_content IS NULL AND image_bytes IS NOT NULL AND image_mime_type IS NOT NULL AND image_size IS NOT NULL)", name=op.f("ck_notes_content_mode")),
        sa.CheckConstraint("text_content IS NULL OR char_length(text_content) BETWEEN 20 AND 2000", name=op.f("ck_notes_text_length")),
        sa.CheckConstraint("image_size IS NULL OR image_size BETWEEN 1 AND 2097152", name=op.f("ck_notes_image_size")),
        sa.ForeignKeyConstraint(["circle_id"], ["circles.id"], ondelete="CASCADE", name=op.f("fk_notes_circle_id_circles")),
        sa.ForeignKeyConstraint(["author_user_id"], ["demo_users.id"], ondelete="CASCADE", name=op.f("fk_notes_author_user_id_demo_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notes")),
        sa.UniqueConstraint("author_user_id", "idempotency_key", name="uq_notes_author_idempotency"),
    )
    op.create_index("ix_notes_circle_created", "notes", ["circle_id", sa.text("created_at DESC")])
    op.create_index("ix_notes_circle_category_created", "notes", ["circle_id", "category", sa.text("created_at DESC")])
    op.create_table(
        "note_reactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("note_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reaction_type", sa.String(length=20), server_default="helpful", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("reaction_type = 'helpful'", name=op.f("ck_note_reactions_reaction_type")),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE", name=op.f("fk_note_reactions_note_id_notes")),
        sa.ForeignKeyConstraint(["user_id"], ["demo_users.id"], ondelete="CASCADE", name=op.f("fk_note_reactions_user_id_demo_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_note_reactions")),
        sa.UniqueConstraint("note_id", "user_id", "reaction_type", name="uq_note_reactions_note_user_type"),
    )
    op.drop_constraint(op.f("ck_activity_events_event_type"), "activity_events", type_="check")
    op.create_check_constraint(op.f("ck_activity_events_event_type"), "activity_events", "event_type IN ('checkpoint_completed', 'rank_changed', 'member_joined', 'daily_quest_completed', 'streak_increased', 'note_created')")


def downgrade() -> None:
    op.execute("DELETE FROM activity_events WHERE event_type = 'note_created'")
    op.drop_constraint(op.f("ck_activity_events_event_type"), "activity_events", type_="check")
    op.create_check_constraint(op.f("ck_activity_events_event_type"), "activity_events", "event_type IN ('checkpoint_completed', 'rank_changed', 'member_joined', 'daily_quest_completed', 'streak_increased')")
    op.drop_table("note_reactions")
    op.drop_index("ix_notes_circle_category_created", table_name="notes")
    op.drop_index("ix_notes_circle_created", table_name="notes")
    op.drop_table("notes")
