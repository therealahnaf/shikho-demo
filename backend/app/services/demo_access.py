from __future__ import annotations

import hmac
import secrets

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import AppError
from app.models import DemoUser
from app.schemas import DemoSessionVerify, DemoUserCreate

ACCESS_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
MAX_KEY_ATTEMPTS = 5


def generate_access_key() -> str:
    first = "".join(secrets.choice(ACCESS_KEY_ALPHABET) for _ in range(4))
    second = "".join(secrets.choice(ACCESS_KEY_ALPHABET) for _ in range(4))
    return f"SC-{first}-{second}"


async def create_demo_user(session: AsyncSession, data: DemoUserCreate) -> DemoUser:
    existing = await session.scalar(
        select(DemoUser.id).where(DemoUser.username == data.username)
    )
    if existing is not None:
        raise AppError(
            status_code=409,
            code="username_taken",
            message="That username is already in use.",
            fields={"username": "Choose a different username."},
        )

    for _ in range(MAX_KEY_ATTEMPTS):
        access_key = generate_access_key()
        key_exists = await session.scalar(
            select(DemoUser.id).where(DemoUser.access_key == access_key)
        )
        if key_exists is not None:
            continue

        user = DemoUser(**data.model_dump(), access_key=access_key)
        session.add(user)
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            username_exists = await session.scalar(
                select(DemoUser.id).where(DemoUser.username == data.username)
            )
            if username_exists is not None:
                raise AppError(
                    status_code=409,
                    code="username_taken",
                    message="That username is already in use.",
                    fields={"username": "Choose a different username."},
                )
            continue

        await session.refresh(user)
        return user

    raise AppError(
        status_code=503,
        code="access_key_unavailable",
        message="Could not create a demo key. Please try again.",
    )


async def verify_demo_access(
    session: AsyncSession, credentials: DemoSessionVerify
) -> DemoUser:
    user = await session.scalar(
        select(DemoUser).where(DemoUser.username == credentials.username)
    )
    if user is None or not hmac.compare_digest(user.access_key, credentials.access_key):
        raise AppError(
            status_code=401,
            code="invalid_demo_access",
            message="Username or key is incorrect.",
        )
    return user

