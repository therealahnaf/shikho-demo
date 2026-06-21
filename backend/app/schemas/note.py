from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.circle import MemberUser


class NoteSummary(BaseModel):
    id: uuid.UUID
    title: str
    category: Literal["chapter_1", "chapter_2", "formulas", "revision_notes", "important_questions"]
    content_type: Literal["text", "image"]
    author: MemberUser
    helpful_count: int
    helpful_by_me: bool
    is_own_note: bool
    created_at: datetime


class NoteDetail(NoteSummary):
    text_content: str | None
    image_url: str | None


class NoteListResponse(BaseModel):
    notes: list[NoteSummary]


class NoteCreateResponse(BaseModel):
    note: NoteDetail
    points_added: int
    previous_rank: int
    current_rank: int


class HelpfulResponse(BaseModel):
    note_id: uuid.UUID
    helpful_count: int
    helpful_by_me: bool
