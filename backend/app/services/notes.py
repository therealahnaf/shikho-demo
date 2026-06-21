from __future__ import annotations

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import AppError
from app.models import ActivityEvent, Circle, CircleMembership, DemoUser, Note, NoteReaction
from app.schemas.circle import MemberUser
from app.schemas.note import HelpfulResponse, NoteCreateResponse, NoteDetail, NoteListResponse, NoteSummary

CATEGORIES = {"chapter_1", "chapter_2", "formulas", "revision_notes", "important_questions"}
IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 2 * 1024 * 1024
POINTS_PER_NOTE = 10


def _ranked(rows: list[tuple[CircleMembership, DemoUser]]) -> list[tuple[CircleMembership, DemoUser]]:
    return sorted(rows, key=lambda row: (-row[0].weekly_points, row[0].joined_at, str(row[0].user_id)))


def _rank(rows: list[tuple[CircleMembership, DemoUser]], user_id: uuid.UUID) -> int:
    return next(index for index, (membership, _) in enumerate(_ranked(rows), 1) if membership.user_id == user_id)


async def _require_member(session: AsyncSession, user: DemoUser, circle_id: uuid.UUID) -> CircleMembership:
    if await session.get(Circle, circle_id) is None:
        raise AppError(status_code=404, code="circle_not_found", message="StudyCircle not found.")
    membership = await session.scalar(select(CircleMembership).where(CircleMembership.circle_id == circle_id, CircleMembership.user_id == user.id))
    if membership is None:
        raise AppError(status_code=403, code="circle_membership_required", message="Join this StudyCircle to continue.")
    return membership


async def _note_or_404(session: AsyncSession, circle_id: uuid.UUID, note_id: uuid.UUID) -> Note:
    note = await session.scalar(select(Note).where(Note.id == note_id, Note.circle_id == circle_id))
    if note is None:
        raise AppError(status_code=404, code="note_not_found", message="Note not found.")
    return note


def _valid_signature(data: bytes, mime_type: str) -> bool:
    if mime_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/jpeg":
        return data.startswith(b"\xff\xd8\xff")
    if mime_type == "image/webp":
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return False


async def _summary(session: AsyncSession, note: Note, current_user_id: uuid.UUID, *, detail: bool = False) -> NoteSummary | NoteDetail:
    author = await session.get(DemoUser, note.author_user_id)
    helpful_count = int(await session.scalar(select(func.count()).select_from(NoteReaction).where(NoteReaction.note_id == note.id)) or 0)
    helpful_by_me = bool(await session.scalar(select(func.count()).select_from(NoteReaction).where(NoteReaction.note_id == note.id, NoteReaction.user_id == current_user_id)))
    values = dict(
        id=note.id,
        title=note.title,
        category=note.category,
        content_type=note.content_type,
        author=MemberUser(id=author.id, username=author.username, display_name=author.display_name),
        helpful_count=helpful_count,
        helpful_by_me=helpful_by_me,
        is_own_note=note.author_user_id == current_user_id,
        created_at=note.created_at,
    )
    if detail:
        return NoteDetail(**values, text_content=note.text_content, image_url=f"/api/v1/circles/{note.circle_id}/notes/{note.id}/image" if note.content_type == "image" else None)
    return NoteSummary(**values)


async def list_notes(session: AsyncSession, user: DemoUser, circle_id: uuid.UUID, category: str | None, limit: int) -> NoteListResponse:
    await _require_member(session, user, circle_id)
    if category is not None and category not in CATEGORIES:
        raise AppError(status_code=422, code="validation_error", message="Choose a valid note category.", fields={"category": "Invalid category."})
    query = select(Note).where(Note.circle_id == circle_id)
    if category:
        query = query.where(Note.category == category)
    notes = list((await session.scalars(query.order_by(Note.created_at.desc(), Note.id.desc()).limit(limit))).all())
    return NoteListResponse(notes=[await _summary(session, note, user.id) for note in notes])


async def note_detail(session: AsyncSession, user: DemoUser, circle_id: uuid.UUID, note_id: uuid.UUID) -> NoteDetail:
    await _require_member(session, user, circle_id)
    return await _summary(session, await _note_or_404(session, circle_id, note_id), user.id, detail=True)


async def note_image(session: AsyncSession, user: DemoUser, circle_id: uuid.UUID, note_id: uuid.UUID) -> Note:
    await _require_member(session, user, circle_id)
    note = await _note_or_404(session, circle_id, note_id)
    if note.content_type != "image" or not note.image_bytes or not note.image_mime_type:
        raise AppError(status_code=404, code="note_image_not_found", message="This note does not have an image.")
    return note


async def create_note(
    session: AsyncSession,
    user: DemoUser,
    circle_id: uuid.UUID,
    *,
    idempotency_key: str | None,
    title: str,
    category: str,
    content_type: str,
    text_content: str | None,
    image_bytes: bytes | None,
    image_mime_type: str | None,
) -> tuple[NoteCreateResponse, bool]:
    await _require_member(session, user, circle_id)
    key = (idempotency_key or "").strip()
    if not key or len(key) > 80:
        raise AppError(status_code=400, code="idempotency_key_required", message="A valid Idempotency-Key header is required.")
    existing = await session.scalar(select(Note).where(Note.author_user_id == user.id, Note.idempotency_key == key))
    if existing:
        rows = list((await session.execute(select(CircleMembership, DemoUser).join(DemoUser, DemoUser.id == CircleMembership.user_id).where(CircleMembership.circle_id == existing.circle_id))).all())
        rank = _rank(rows, user.id)
        return NoteCreateResponse(note=await _summary(session, existing, user.id, detail=True), points_added=0, previous_rank=rank, current_rank=rank), False

    clean_title = title.strip()
    clean_text = text_content.strip() if text_content else None
    fields: dict[str, str] = {}
    if not 3 <= len(clean_title) <= 120:
        fields["title"] = "Title must be between 3 and 120 characters."
    if category not in CATEGORIES:
        fields["category"] = "Choose a valid category."
    if content_type not in {"text", "image"}:
        fields["content_type"] = "Choose text or image."
    if content_type == "text" and (not clean_text or not 20 <= len(clean_text) <= 2000):
        fields["text_content"] = "Text notes must be between 20 and 2000 characters."
    if content_type == "text" and image_bytes is not None:
        fields["image"] = "A text note cannot include an image."
    if content_type == "image":
        if clean_text:
            fields["text_content"] = "An image note cannot include text content."
        if not image_bytes or not image_mime_type:
            fields["image"] = "Choose an image."
        elif len(image_bytes) > MAX_IMAGE_BYTES:
            raise AppError(status_code=413, code="image_too_large", message="Images must be 2 MB or smaller.", fields={"image": "Maximum size is 2 MB."})
        elif image_mime_type not in IMAGE_MIME_TYPES or not _valid_signature(image_bytes, image_mime_type):
            fields["image"] = "Use a valid JPEG, PNG, or WebP image."
    if fields:
        raise AppError(status_code=422, code="validation_error", message="Please correct the highlighted fields.", fields=fields)

    rows = list((await session.execute(select(CircleMembership, DemoUser).join(DemoUser, DemoUser.id == CircleMembership.user_id).where(CircleMembership.circle_id == circle_id).order_by(CircleMembership.user_id).with_for_update(of=CircleMembership))).all())
    existing = await session.scalar(select(Note).where(Note.author_user_id == user.id, Note.idempotency_key == key))
    if existing:
        rank = _rank(rows, user.id)
        return NoteCreateResponse(note=await _summary(session, existing, user.id, detail=True), points_added=0, previous_rank=rank, current_rank=rank), False
    membership = next(row[0] for row in rows if row[0].user_id == user.id)
    previous_rank = _rank(rows, user.id)
    note = Note(
        circle_id=circle_id,
        author_user_id=user.id,
        title=clean_title,
        category=category,
        content_type=content_type,
        text_content=clean_text if content_type == "text" else None,
        image_bytes=image_bytes if content_type == "image" else None,
        image_mime_type=image_mime_type if content_type == "image" else None,
        image_size=len(image_bytes) if image_bytes is not None and content_type == "image" else None,
        idempotency_key=key,
    )
    session.add(note)
    await session.flush()
    membership.weekly_points += POINTS_PER_NOTE
    current_rank = _rank(rows, user.id)
    session.add(ActivityEvent(circle_id=circle_id, actor_user_id=user.id, event_type="note_created", payload={"note_id": str(note.id), "title": note.title, "category": note.category, "content_type": note.content_type}, dedupe_key=f"note:{note.id}:created"))
    if current_rank != previous_rank:
        session.add(ActivityEvent(circle_id=circle_id, actor_user_id=user.id, event_type="rank_changed", payload={"rank": current_rank, "previous_rank": previous_rank}, dedupe_key=f"note:{note.id}:rank:{previous_rank}:{current_rank}"))
    await session.commit()
    return NoteCreateResponse(note=await _summary(session, note, user.id, detail=True), points_added=POINTS_PER_NOTE, previous_rank=previous_rank, current_rank=current_rank), True


async def set_helpful(session: AsyncSession, user: DemoUser, circle_id: uuid.UUID, note_id: uuid.UUID, helpful: bool) -> HelpfulResponse:
    await _require_member(session, user, circle_id)
    note = await _note_or_404(session, circle_id, note_id)
    if note.author_user_id == user.id:
        raise AppError(status_code=403, code="own_note_reaction_not_allowed", message="You cannot mark your own note as helpful.")
    if helpful:
        await session.execute(pg_insert(NoteReaction).values(note_id=note_id, user_id=user.id, reaction_type="helpful").on_conflict_do_nothing(index_elements=[NoteReaction.note_id, NoteReaction.user_id, NoteReaction.reaction_type]))
    else:
        await session.execute(delete(NoteReaction).where(NoteReaction.note_id == note_id, NoteReaction.user_id == user.id, NoteReaction.reaction_type == "helpful"))
    await session.commit()
    count = int(await session.scalar(select(func.count()).select_from(NoteReaction).where(NoteReaction.note_id == note_id)) or 0)
    return HelpfulResponse(note_id=note_id, helpful_count=count, helpful_by_me=helpful)
