from __future__ import annotations

import asyncio
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionFactory
from app.models import ActivityEvent, Circle, CircleMembership, DemoUser
from app.scripts.seed_demo import CIRCLE_ID, PEERS, seed_phase_one
from app.services.circles import join_circle


def user_payload(username: str | None = None) -> dict[str, str]:
    return {
        "username": username or f"circle_{uuid.uuid4().hex[:8]}",
        "display_name": "Circle Student",
        "class_level": "class_10",
        "curriculum": "nctb_bangla",
        "preferred_subject": "mathematics",
        "school_name": "Example School",
    }


async def create_student(client: AsyncClient) -> tuple[dict, dict[str, str]]:
    payload = user_payload()
    created = (await client.post("/api/v1/demo-users", json=payload)).json()
    headers = {
        "X-Demo-Username": payload["username"],
        "X-Demo-Access-Key": created["access_key"],
    }
    return created, headers


@pytest.mark.asyncio
async def test_recommendation_and_membership_lookup(client: AsyncClient) -> None:
    _created, headers = await create_student(client)

    recommendation = await client.get("/api/v1/circles/recommended", headers=headers)
    membership = await client.get("/api/v1/me/circle-membership", headers=headers)

    assert recommendation.status_code == 200
    assert recommendation.json()["data"]["name"] == "Math Champions"
    assert recommendation.json()["data"]["member_count"] == 5
    assert recommendation.json()["data"]["mission"]["progress"] == 31
    assert membership.json() == {"membership": None}


@pytest.mark.asyncio
async def test_recommendation_returns_explicit_no_match(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _created, headers = await create_student(client)
    await db_session.execute(
        update(Circle).values(subject="english")
    )
    await db_session.flush()

    response = await client.get("/api/v1/circles/recommended", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"] is None
    assert "current class and subject" in response.json()["reason"]


@pytest.mark.asyncio
async def test_home_requires_membership(client: AsyncClient) -> None:
    _created, headers = await create_student(client)
    response = await client.get(f"/api/v1/circles/{CIRCLE_ID}/home", headers=headers)

    assert response.status_code == 403
    assert response.json()["code"] == "circle_membership_required"


@pytest.mark.asyncio
async def test_join_is_idempotent_and_home_is_consistent(client: AsyncClient) -> None:
    _created, headers = await create_student(client)

    first = await client.post(f"/api/v1/circles/{CIRCLE_ID}/join", headers=headers)
    second = await client.post(f"/api/v1/circles/{CIRCLE_ID}/join", headers=headers)
    membership = await client.get("/api/v1/me/circle-membership", headers=headers)
    home = await client.get(f"/api/v1/circles/{CIRCLE_ID}/home", headers=headers)

    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["membership"]["id"] == second.json()["membership"]["id"]
    assert membership.json()["membership"]["circle_id"] == str(CIRCLE_ID)
    assert home.status_code == 200
    body = home.json()
    assert body["circle"]["member_count"] == 6
    assert body["mission"]["percent_complete"] == 62
    assert body["daily_quest"]["percent_complete"] == 40
    assert body["streak"]["days"] == 7
    assert body["mentor"]["display_name"] == "Nabila"
    assert len(body["roadmap"]["checkpoints"]) == 5
    assert body["leaderboard"]["current_user_rank"] == 6
    join_events = [event for event in body["activity_feed"] if event["event_type"] == "member_joined"]
    assert len(join_events) == 1


@pytest.mark.asyncio
async def test_fixture_users_cannot_authenticate(client: AsyncClient) -> None:
    fixture = PEERS[0]
    response = await client.get(
        "/api/v1/me",
        headers={
            "X-Demo-Username": fixture["username"],
            "X-Demo-Access-Key": fixture["access_key"],
        },
    )
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_demo_access"


@pytest.mark.asyncio
async def test_seed_is_idempotent() -> None:
    first = await seed_phase_one()
    second = await seed_phase_one()
    assert first == second == {
        "circles": 4,
        "fixture_users": 10,
        "memberships": 5,
        "checkpoints": 5,
        "activity_events": 8,
        "notes": 5,
    }


@pytest.mark.asyncio
async def test_concurrent_join_creates_one_membership_and_event() -> None:
    user_id = uuid.uuid4()
    username = f"concurrent_{uuid.uuid4().hex[:8]}"
    async with AsyncSessionFactory() as setup_session:
        setup_session.add(
            DemoUser(
                id=user_id,
                username=username,
                display_name="Concurrent Student",
                class_level="class_10",
                curriculum="nctb_bangla",
                preferred_subject="mathematics",
                school_name=None,
                access_key="SC-CCCC-3333",
                is_seed_fixture=False,
            )
        )
        await setup_session.commit()

    async def perform_join() -> bool:
        async with AsyncSessionFactory() as session:
            user = await session.get(DemoUser, user_id)
            assert user is not None
            _response, created = await join_circle(session, user, CIRCLE_ID)
            return created

    try:
        results = await asyncio.gather(perform_join(), perform_join())
        assert sorted(results) == [False, True]
        async with AsyncSessionFactory() as verify_session:
            membership_count = await verify_session.scalar(
                select(func.count())
                .select_from(CircleMembership)
                .where(CircleMembership.circle_id == CIRCLE_ID, CircleMembership.user_id == user_id)
            )
            event_count = await verify_session.scalar(
                select(func.count())
                .select_from(ActivityEvent)
                .where(ActivityEvent.dedupe_key == f"join:{CIRCLE_ID}:{user_id}")
            )
            assert membership_count == 1
            assert event_count == 1
    finally:
        async with AsyncSessionFactory() as cleanup:
            await cleanup.execute(delete(ActivityEvent).where(ActivityEvent.actor_user_id == user_id))
            await cleanup.execute(delete(CircleMembership).where(CircleMembership.user_id == user_id))
            await cleanup.execute(delete(DemoUser).where(DemoUser.id == user_id))
            await cleanup.commit()


@pytest.mark.asyncio
async def test_leave_circle(client: AsyncClient, db_session: AsyncSession) -> None:
    _created, headers = await create_student(client)

    # Initially not in circle
    leave_fail = await client.post(f"/api/v1/circles/{CIRCLE_ID}/leave", headers=headers)
    assert leave_fail.status_code == 400
    assert leave_fail.json()["code"] == "not_in_circle"

    # Join circle
    join = await client.post(f"/api/v1/circles/{CIRCLE_ID}/join", headers=headers)
    assert join.status_code == 201

    # Leave circle
    leave = await client.post(f"/api/v1/circles/{CIRCLE_ID}/leave", headers=headers)
    assert leave.status_code == 200
    assert leave.json() == {"success": True, "message": "Successfully left the StudyCircle."}

    # Verify no longer a member
    membership = await client.get("/api/v1/me/circle-membership", headers=headers)
    assert membership.json() == {"membership": None}

