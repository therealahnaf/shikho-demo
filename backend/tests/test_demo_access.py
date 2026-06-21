from __future__ import annotations

import re
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DemoUser
from app.schemas import DemoUserCreate
from app.services import demo_access


def user_payload(username: str | None = None) -> dict[str, str]:
    return {
        "username": username or f"student_{uuid.uuid4().hex[:8]}",
        "display_name": "Demo Student",
        "class_level": "class_10",
        "curriculum": "nctb_bangla",
        "preferred_subject": "mathematics",
        "school_name": "Example School",
    }


@pytest.mark.asyncio
async def test_create_normalizes_user_and_returns_key(client: AsyncClient) -> None:
    payload = user_payload("  Student_Name  ")
    response = await client.post("/api/v1/demo-users", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["username"] == "student_name"
    assert body["user"]["display_name"] == "Demo Student"
    assert re.fullmatch(r"SC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}", body["access_key"])
    assert "access_key" not in body["user"]


@pytest.mark.asyncio
async def test_duplicate_username_uses_common_error(client: AsyncClient) -> None:
    payload = user_payload()
    assert (await client.post("/api/v1/demo-users", json=payload)).status_code == 201

    response = await client.post("/api/v1/demo-users", json=payload)
    assert response.status_code == 409
    assert response.json() == {
        "code": "username_taken",
        "message": "That username is already in use.",
        "fields": {"username": "Choose a different username."},
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("username", "not valid"),
        ("display_name", "x"),
        ("class_level", "class_9"),
        ("curriculum", "other"),
        ("preferred_subject", "english"),
    ],
)
async def test_invalid_metadata_uses_validation_envelope(
    client: AsyncClient, field: str, value: str
) -> None:
    payload = user_payload()
    payload[field] = value
    response = await client.post("/api/v1/demo-users", json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert field in response.json()["fields"]


@pytest.mark.asyncio
async def test_verify_and_me_never_leak_access_key(client: AsyncClient) -> None:
    payload = user_payload()
    created = (await client.post("/api/v1/demo-users", json=payload)).json()
    credentials = {"username": payload["username"], "access_key": created["access_key"]}

    verified = await client.post("/api/v1/demo-sessions/verify", json=credentials)
    assert verified.status_code == 200
    assert "access_key" not in verified.json()

    me = await client.get(
        "/api/v1/me",
        headers={
            "X-Demo-Username": payload["username"],
            "X-Demo-Access-Key": created["access_key"],
        },
    )
    assert me.status_code == 200
    assert "access_key" not in me.json()


@pytest.mark.asyncio
async def test_invalid_username_and_key_have_same_failure(client: AsyncClient) -> None:
    payload = user_payload()
    created = (await client.post("/api/v1/demo-users", json=payload)).json()
    cases = [
        {"username": "missing_user", "access_key": created["access_key"]},
        {"username": payload["username"], "access_key": "SC-AAAA-AAAA"},
    ]

    for credentials in cases:
        response = await client.post("/api/v1/demo-sessions/verify", json=credentials)
        assert response.status_code == 401
        assert response.json()["message"] == "Username or key is incorrect."


@pytest.mark.asyncio
async def test_missing_demo_headers_are_unauthorized(client: AsyncClient) -> None:
    response = await client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_demo_access"


@pytest.mark.asyncio
async def test_access_key_collision_is_retried(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    occupied_key = "SC-AAAA-AAAA"
    db_session.add(
        DemoUser(
            username=f"occupied_{uuid.uuid4().hex[:6]}",
            display_name="Existing Student",
            class_level="class_10",
            curriculum="nctb_bangla",
            preferred_subject="mathematics",
            school_name=None,
            access_key=occupied_key,
        )
    )
    await db_session.commit()

    keys = iter([occupied_key, "SC-BBBB-BBBB"])
    monkeypatch.setattr(demo_access, "generate_access_key", lambda: next(keys))
    data = DemoUserCreate(**user_payload())
    user = await demo_access.create_demo_user(db_session, data)

    assert user.access_key == "SC-BBBB-BBBB"

