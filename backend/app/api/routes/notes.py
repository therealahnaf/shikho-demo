from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_demo_user
from app.db import get_db
from app.models import DemoUser
from app.schemas.note import HelpfulResponse, NoteCreateResponse, NoteDetail, NoteListResponse
from app.services.notes import create_note, list_notes, note_detail, note_image, set_helpful

router = APIRouter(prefix="/api/v1/circles/{circle_id}/notes", tags=["circle-store"])


@router.get("", response_model=NoteListResponse)
async def read_notes(
    circle_id: UUID,
    category: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=50),
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> NoteListResponse:
    return await list_notes(session, current_user, circle_id, category, limit)


@router.post("", response_model=NoteCreateResponse)
async def add_note(
    circle_id: UUID,
    response: Response,
    title: str = Form(...),
    category: str = Form(...),
    content_type: str = Form(...),
    text_content: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> NoteCreateResponse:
    image_bytes = await image.read(2 * 1024 * 1024 + 1) if image else None
    result, created = await create_note(
        session,
        current_user,
        circle_id,
        idempotency_key=idempotency_key,
        title=title,
        category=category,
        content_type=content_type,
        text_content=text_content,
        image_bytes=image_bytes,
        image_mime_type=image.content_type if image else None,
    )
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return result


@router.get("/{note_id}", response_model=NoteDetail)
async def read_note(
    circle_id: UUID,
    note_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> NoteDetail:
    return await note_detail(session, current_user, circle_id, note_id)


@router.get("/{note_id}/image")
async def read_note_image(
    circle_id: UUID,
    note_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> Response:
    note = await note_image(session, current_user, circle_id, note_id)
    return Response(
        content=note.image_bytes,
        media_type=note.image_mime_type,
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.put("/{note_id}/helpful", response_model=HelpfulResponse)
async def mark_helpful(
    circle_id: UUID,
    note_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> HelpfulResponse:
    return await set_helpful(session, current_user, circle_id, note_id, True)


@router.delete("/{note_id}/helpful", response_model=HelpfulResponse)
async def remove_helpful(
    circle_id: UUID,
    note_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> HelpfulResponse:
    return await set_helpful(session, current_user, circle_id, note_id, False)
