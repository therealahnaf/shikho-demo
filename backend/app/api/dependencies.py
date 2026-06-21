from __future__ import annotations

import hmac

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import AppError
from app.db import get_db
from app.models import DemoUser
from app.schemas.demo_user import normalize_username

INVALID_ACCESS = AppError(
    status_code=401,
    code="invalid_demo_access",
    message="Username or key is incorrect.",
)


async def get_current_demo_user(
    username_header: str | None = Header(default=None, alias="X-Demo-Username"),
    access_key_header: str | None = Header(default=None, alias="X-Demo-Access-Key"),
    session: AsyncSession = Depends(get_db),
) -> DemoUser:
    if not username_header or not access_key_header:
        raise INVALID_ACCESS

    username = normalize_username(username_header)
    if not isinstance(username, str):
        raise INVALID_ACCESS

    user = await session.scalar(select(DemoUser).where(DemoUser.username == username))
    supplied_key = access_key_header.strip().upper()
    if (
        user is None
        or user.is_seed_fixture
        or not hmac.compare_digest(user.access_key, supplied_key)
    ):
        raise INVALID_ACCESS
    return user
