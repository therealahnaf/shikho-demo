from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CircleMembership
from app.scripts.seed_demo import CIRCLE_ID, seed_phase_one

async def create_custom_student(client: AsyncClient, username: str) -> dict[str, str]:
    payload = {
        "username": username,
        "display_name": f"Student {username}",
        "class_level": "class_10",
        "curriculum": "nctb_bangla",
        "preferred_subject": "mathematics",
        "school_name": "Test School",
    }
    created = (await client.post("/api/v1/demo-users", json=payload)).json()
    headers = {
        "X-Demo-Username": username,
        "X-Demo-Access-Key": created["access_key"],
    }
    return headers

@pytest.mark.asyncio
async def test_phase4_workflow(client: AsyncClient, db_session: AsyncSession) -> None:
    # 1. Setup clean seed database
    await seed_phase_one()

    # 2. Create student 1 (who will be mentor) and student 2 (who will not)
    headers_s1 = await create_custom_student(client, "student1")
    headers_s2 = await create_custom_student(client, "student2")

    # Both join the circle
    join1 = await client.post(f"/api/v1/circles/{CIRCLE_ID}/join", headers=headers_s1)
    assert join1.status_code == 201
    join2 = await client.post(f"/api/v1/circles/{CIRCLE_ID}/join", headers=headers_s2)
    assert join2.status_code == 201

    # In database, make student 1 have 300 points (rank 1), and student 2 have 50 points
    s1_membership_id = join1.json()["membership"]["id"]
    s2_membership_id = join2.json()["membership"]["id"]

    await db_session.execute(
        update(CircleMembership)
        .where(CircleMembership.id == s1_membership_id)
        .values(weekly_points=300)
    )
    await db_session.execute(
        update(CircleMembership)
        .where(CircleMembership.id == s2_membership_id)
        .values(weekly_points=50)
    )
    await db_session.flush()

    # 3. Check home endpoint before finalization
    home_before = await client.get(f"/api/v1/circles/{CIRCLE_ID}/home", headers=headers_s1)
    assert home_before.status_code == 200
    assert home_before.json()["cycle_status"] == "active"
    assert home_before.json()["next_roadmap_published"] is False

    # 4. Finalize the week (crown the leader)
    finalize_res = await client.post(f"/api/v1/demo/circles/{CIRCLE_ID}/finalize-week", headers=headers_s1)
    assert finalize_res.status_code == 200
    assert finalize_res.json()["final_points"] == 300

    # Check home endpoint after finalization
    home_after = await client.get(f"/api/v1/circles/{CIRCLE_ID}/home", headers=headers_s1)
    assert home_after.status_code == 200
    assert home_after.json()["cycle_status"] == "finalized"
    assert home_after.json()["next_roadmap_published"] is False
    assert home_after.json()["mentor"]["display_name"] == "Student student1"

    # Verify a mentor_selected activity event exists
    events = home_after.json()["activity_feed"]
    mentor_events = [e for e in events if e["event_type"] == "mentor_selected"]
    assert len(mentor_events) == 1
    assert mentor_events[0]["payload"]["mentor_name"] == "Student student1"

    # 5. Access control on mentor workspace
    # student 2 (not mentor) should be denied (403)
    workspace_s2 = await client.get(f"/api/v1/circles/{CIRCLE_ID}/mentor-workspace", headers=headers_s2)
    assert workspace_s2.status_code == 403

    # student 1 (mentor) should have access (200)
    workspace_s1 = await client.get(f"/api/v1/circles/{CIRCLE_ID}/mentor-workspace", headers=headers_s1)
    assert workspace_s1.status_code == 200
    workspace_data = workspace_s1.json()
    assert workspace_data["current_term"]["final_points"] == 300
    assert workspace_data["planned_roadmap"] is None
    assert len(workspace_data["notes"]) == 5

    # 6. Validation of roadmap publishing
    note_id = workspace_data["notes"][0]["id"]
    
    # 6a. Invalid checkpoint count (too few)
    bad_payload_few = {
        "title": "Algebra Speedrun",
        "mentor_pick_note_id": note_id,
        "checkpoints": [
            {"topic_key": "algebra_basics", "activity_type": "review"},
            {"topic_key": "linear_equations", "activity_type": "lesson"}
        ]
    }
    publish_res = await client.post(f"/api/v1/circles/{CIRCLE_ID}/next-roadmap", json=bad_payload_few, headers=headers_s1)
    assert publish_res.status_code == 422

    # 6b. Invalid checkpoint count (too many)
    bad_payload_many = {
        "title": "Algebra Speedrun",
        "mentor_pick_note_id": note_id,
        "checkpoints": [
            {"topic_key": "algebra_basics", "activity_type": "review"},
            {"topic_key": "algebra_basics", "activity_type": "review"},
            {"topic_key": "algebra_basics", "activity_type": "review"},
            {"topic_key": "algebra_basics", "activity_type": "review"},
            {"topic_key": "algebra_basics", "activity_type": "review"},
            {"topic_key": "algebra_basics", "activity_type": "review"}
        ]
    }
    publish_res = await client.post(f"/api/v1/circles/{CIRCLE_ID}/next-roadmap", json=bad_payload_many, headers=headers_s1)
    assert publish_res.status_code == 422

    # 6c. Invalid note ID (nonexistent UUID)
    bad_payload_note = {
        "title": "Algebra Speedrun",
        "mentor_pick_note_id": "00000000-0000-0000-0000-000000000000",
        "checkpoints": [
            {"topic_key": "algebra_basics", "activity_type": "review"},
            {"topic_key": "linear_equations", "activity_type": "lesson"},
            {"topic_key": "linear_equations", "activity_type": "quiz"}
        ]
    }
    publish_res = await client.post(f"/api/v1/circles/{CIRCLE_ID}/next-roadmap", json=bad_payload_note, headers=headers_s1)
    assert publish_res.status_code == 400
    assert "Mentor's pick note is invalid" in publish_res.json()["message"]

    # 6d. Valid publishing by mentor
    valid_payload = {
        "title": "Algebra Speedrun",
        "mentor_pick_note_id": note_id,
        "checkpoints": [
            {"topic_key": "algebra_basics", "activity_type": "review"},
            {"topic_key": "linear_equations", "activity_type": "lesson"},
            {"topic_key": "linear_equations", "activity_type": "quiz"}
        ]
    }
    publish_res = await client.post(f"/api/v1/circles/{CIRCLE_ID}/next-roadmap", json=valid_payload, headers=headers_s1)
    assert publish_res.status_code == 200
    assert publish_res.json()["title"] == "Algebra Speedrun"
    assert publish_res.json()["mentor_pick_note_id"] == note_id

    # Check home endpoint to see next_roadmap_published is True
    home_published = await client.get(f"/api/v1/circles/{CIRCLE_ID}/home", headers=headers_s1)
    assert home_published.json()["next_roadmap_published"] is True

    # Verify a roadmap_published event is in feed
    events = home_published.json()["activity_feed"]
    publish_events = [e for e in events if e["event_type"] == "roadmap_published"]
    assert len(publish_events) == 1
    assert publish_events[0]["payload"]["roadmap_title"] == "Algebra Speedrun"

    # 7. Start the next week (rollover)
    rollover_res = await client.post(f"/api/v1/demo/circles/{CIRCLE_ID}/start-next-week", headers=headers_s1)
    assert rollover_res.status_code == 200

    # 7b. Verify database state after rollover
    home_rolled = await client.get(f"/api/v1/circles/{CIRCLE_ID}/home", headers=headers_s1)
    assert home_rolled.json()["cycle_status"] == "active"
    assert home_rolled.json()["next_roadmap_published"] is False
    # Roadmap should now be the newly activated one
    assert home_rolled.json()["roadmap"]["title"] == "Algebra Speedrun"
    assert len(home_rolled.json()["roadmap"]["checkpoints"]) == 3

    # Weekly points for student 1 and 2 should be reset to 0
    leaderboard_res = await client.get(f"/api/v1/circles/{CIRCLE_ID}/leaderboard", headers=headers_s1)
    assert leaderboard_res.status_code == 200
    entries = leaderboard_res.json()["entries"]
    for entry in entries:
        assert entry["weekly_points"] == 0

    # Verify a week_started activity event is in feed
    events = home_rolled.json()["activity_feed"]
    start_events = [e for e in events if e["event_type"] == "week_started"]
    assert len(start_events) == 1
