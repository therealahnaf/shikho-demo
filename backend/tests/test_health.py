from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import SQLAlchemyError

from app.db import get_db
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient) -> None:
    live = await client.get("/health/live")
    ready = await client.get("/health/ready")

    assert live.status_code == 200
    assert live.json() == {"status": "ok"}
    assert ready.status_code == 200
    assert ready.json() == {"status": "ready"}


@pytest.mark.asyncio
async def test_ready_returns_503_when_database_fails() -> None:
    class FailingSession:
        async def execute(self, _statement) -> None:
            raise SQLAlchemyError("database down")

    async def failing_db() -> AsyncIterator[FailingSession]:
        yield FailingSession()

    app.dependency_overrides[get_db] = failing_db
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/health/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["code"] == "database_unavailable"

