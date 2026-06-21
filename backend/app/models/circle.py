from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Circle(Base):
    __tablename__ = "circles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    class_level: Mapped[str] = mapped_column(String(30), nullable=False)
    subject: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CircleMembership(Base):
    __tablename__ = "circle_memberships"
    __table_args__ = (
        CheckConstraint("weekly_points >= 0", name="weekly_points"),
        CheckConstraint("roadmap_position >= 0", name="roadmap_position"),
        CheckConstraint("personal_contribution >= 0", name="personal_contribution"),
        UniqueConstraint(
            "circle_id", "user_id", name="uq_circle_memberships_circle_user"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("circles.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("demo_users.id", ondelete="CASCADE"), nullable=False)
    weekly_points: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    roadmap_position: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    personal_contribution: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Mission(Base):
    __tablename__ = "missions"
    __table_args__ = (
        CheckConstraint("target > 0", name="target"),
        CheckConstraint("progress >= 0 AND progress <= target", name="progress"),
        CheckConstraint("ends_at > starts_at", name="date_range"),
        CheckConstraint("status IN ('active', 'archived')", name="status"),
        Index(
            "uq_missions_active_circle",
            "circle_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("circles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(140), nullable=False)
    target: Mapped[int] = mapped_column(Integer, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)


class DailyQuest(Base):
    __tablename__ = "daily_quests"
    __table_args__ = (
        CheckConstraint("target > 0", name="target"),
        CheckConstraint("progress >= 0 AND progress <= target", name="progress"),
        UniqueConstraint(
            "circle_id", "local_date", name="uq_daily_quests_circle_date"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("circles.id", ondelete="CASCADE"), nullable=False)
    local_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(140), nullable=False)
    target: Mapped[int] = mapped_column(Integer, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class WeeklyCycle(Base):
    __tablename__ = "weekly_cycles"
    __table_args__ = (
        CheckConstraint("week_number BETWEEN 1 AND 53", name="week_number"),
        CheckConstraint("ends_at > starts_at", name="date_range"),
        CheckConstraint("status IN ('active', 'archived', 'planned', 'finalized')", name="status"),
        Index(
            "uq_weekly_cycles_active_circle",
            "circle_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("circles.id", ondelete="CASCADE"), nullable=False)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)


class Roadmap(Base):
    __tablename__ = "roadmaps"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published')", name="status"),
        UniqueConstraint("weekly_cycle_id", name="uq_roadmaps_weekly_cycle_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    weekly_cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("weekly_cycles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("demo_users.id", ondelete="SET NULL"), nullable=True)
    mentor_pick_note_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("notes.id", ondelete="SET NULL"), nullable=True)


class RoadmapCheckpoint(Base):
    __tablename__ = "roadmap_checkpoints"
    __table_args__ = (
        CheckConstraint("position >= 0", name="position"),
        CheckConstraint("activity_type IN ('review', 'lesson', 'quiz', 'challenge')", name="activity_type"),
        UniqueConstraint(
            "roadmap_id", "position", name="uq_roadmap_checkpoints_roadmap_position"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roadmap_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    topic_key: Mapped[str] = mapped_column(String(60), nullable=False)


class CircleState(Base):
    __tablename__ = "circle_state"
    __table_args__ = (CheckConstraint("streak_days >= 0", name="streak_days"),)

    circle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("circles.id", ondelete="CASCADE"), primary_key=True)
    streak_days: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    current_mentor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("demo_users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ActivityEvent(Base):
    __tablename__ = "activity_events"
    __table_args__ = (
        CheckConstraint(
            "event_type IN ('checkpoint_completed', 'rank_changed', 'member_joined', 'daily_quest_completed', 'streak_increased', 'note_created', 'mentor_selected', 'roadmap_published', 'week_started')",
            name="event_type",
        ),
        Index("ix_activity_events_circle_created", "circle_id", text("created_at DESC")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("circles.id", ondelete="CASCADE"), nullable=False)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("demo_users.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    dedupe_key: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ActivityCompletion(Base):
    __tablename__ = "activity_completions"
    __table_args__ = (
        CheckConstraint(
            "activity_type IN ('review', 'lesson', 'quiz', 'challenge')",
            name="activity_type",
        ),
        CheckConstraint("points_awarded = 30", name="points_awarded"),
        UniqueConstraint(
            "weekly_cycle_id",
            "roadmap_checkpoint_id",
            "user_id",
            name="uq_activity_completions_cycle_checkpoint_user",
        ),
        Index("ix_activity_completions_user_cycle", "user_id", "weekly_cycle_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    circle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("circles.id", ondelete="CASCADE"), nullable=False
    )
    weekly_cycle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("weekly_cycles.id", ondelete="CASCADE"), nullable=False
    )
    roadmap_checkpoint_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("roadmap_checkpoints.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("demo_users.id", ondelete="CASCADE"), nullable=False
    )
    activity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    points_awarded: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (
        CheckConstraint("category IN ('chapter_1', 'chapter_2', 'formulas', 'revision_notes', 'important_questions')", name="category"),
        CheckConstraint("content_type IN ('text', 'image')", name="content_type"),
        CheckConstraint("(content_type = 'text' AND text_content IS NOT NULL AND image_bytes IS NULL AND image_mime_type IS NULL AND image_size IS NULL) OR (content_type = 'image' AND text_content IS NULL AND image_bytes IS NOT NULL AND image_mime_type IS NOT NULL AND image_size IS NOT NULL)", name="content_mode"),
        CheckConstraint("text_content IS NULL OR char_length(text_content) BETWEEN 20 AND 2000", name="text_length"),
        CheckConstraint("image_size IS NULL OR image_size BETWEEN 1 AND 2097152", name="image_size"),
        UniqueConstraint("author_user_id", "idempotency_key", name="uq_notes_author_idempotency"),
        Index("ix_notes_circle_created", "circle_id", text("created_at DESC")),
        Index("ix_notes_circle_category_created", "circle_id", "category", text("created_at DESC")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("circles.id", ondelete="CASCADE"), nullable=False)
    author_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("demo_users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    content_type: Mapped[str] = mapped_column(String(10), nullable=False)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    image_mime_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    image_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class NoteReaction(Base):
    __tablename__ = "note_reactions"
    __table_args__ = (
        CheckConstraint("reaction_type = 'helpful'", name="reaction_type"),
        UniqueConstraint("note_id", "user_id", "reaction_type", name="uq_note_reactions_note_user_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("demo_users.id", ondelete="CASCADE"), nullable=False)
    reaction_type: Mapped[str] = mapped_column(String(20), default="helpful", server_default="helpful", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MentorTerm(Base):
    __tablename__ = "mentor_terms"
    __table_args__ = (
        CheckConstraint("final_rank = 1", name="final_rank"),
        UniqueConstraint("weekly_cycle_id", name="uq_mentor_terms_weekly_cycle_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    circle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("circles.id", ondelete="CASCADE"), nullable=False)
    weekly_cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("weekly_cycles.id", ondelete="CASCADE"), nullable=False)
    mentor_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("demo_users.id", ondelete="CASCADE"), nullable=False)
    final_rank: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    final_points: Mapped[int] = mapped_column(Integer, nullable=False)
    selected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

