from __future__ import annotations

import asyncio
import base64
from datetime import datetime, time, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, text, update

from app.db import AsyncSessionFactory, engine
from app.models import (
    ActivityEvent,
    Circle,
    CircleMembership,
    CircleState,
    DailyQuest,
    DemoUser,
    Mission,
    Note,
    Roadmap,
    RoadmapCheckpoint,
    WeeklyCycle,
)

DHAKA = ZoneInfo("Asia/Dhaka")

CIRCLE_ID = UUID("20000000-0000-0000-0000-000000000001")
MISSION_ID = UUID("40000000-0000-0000-0000-000000000001")
QUEST_ID = UUID("50000000-0000-0000-0000-000000000001")
WEEKLY_CYCLE_ID = UUID("60000000-0000-0000-0000-000000000001")
ROADMAP_ID = UUID("70000000-0000-0000-0000-000000000001")

PEERS = [
    {
        "id": UUID("10000000-0000-0000-0000-000000000001"),
        "membership_id": UUID("30000000-0000-0000-0000-000000000001"),
        "username": "nabila_fixture",
        "display_name": "Nabila",
        "access_key": "SC-NABL-2222",
        "weekly_points": 240,
        "roadmap_position": 4,
        "personal_contribution": 8,
    },
    {
        "id": UUID("10000000-0000-0000-0000-000000000002"),
        "membership_id": UUID("30000000-0000-0000-0000-000000000002"),
        "username": "rafi_fixture",
        "display_name": "Rafi",
        "access_key": "SC-RAFA-2223",
        "weekly_points": 210,
        "roadmap_position": 3,
        "personal_contribution": 7,
    },
    {
        "id": UUID("10000000-0000-0000-0000-000000000003"),
        "membership_id": UUID("30000000-0000-0000-0000-000000000003"),
        "username": "samia_fixture",
        "display_name": "Samia",
        "access_key": "SC-SAMA-2224",
        "weekly_points": 170,
        "roadmap_position": 3,
        "personal_contribution": 6,
    },
    {
        "id": UUID("10000000-0000-0000-0000-000000000004"),
        "membership_id": UUID("30000000-0000-0000-0000-000000000004"),
        "username": "fahim_fixture",
        "display_name": "Fahim",
        "access_key": "SC-FAHM-2225",
        "weekly_points": 130,
        "roadmap_position": 2,
        "personal_contribution": 5,
    },
    {
        "id": UUID("10000000-0000-0000-0000-000000000005"),
        "membership_id": UUID("30000000-0000-0000-0000-000000000005"),
        "username": "arif_fixture",
        "display_name": "Arif",
        "access_key": "SC-ARAF-2226",
        "weekly_points": 90,
        "roadmap_position": 1,
        "personal_contribution": 5,
    },
]

CHECKPOINTS = [
    ("Review Algebra Basics", "review", "algebra_basics"),
    ("Explore Linear Equations", "lesson", "linear_equations"),
    ("Practice Quiz", "quiz", "linear_equations"),
    ("Review Common Mistakes", "review", "algebra_mistakes"),
    ("Weekly Algebra Challenge", "challenge", "weekly_challenge"),
]

SEEDED_NOTES = [
    ("a0000000-0000-0000-0000-000000000001", 0, "Quadratic formula quick guide", "formulas", "Keep the quadratic formula beside your practice work: x = (-b ± √(b² - 4ac)) / 2a. Check the discriminant first to understand the roots."),
    ("a0000000-0000-0000-0000-000000000002", 1, "Chapter 1 sign rules", "chapter_1", "When multiplying or dividing integers, matching signs produce a positive result and different signs produce a negative result."),
    ("a0000000-0000-0000-0000-000000000003", 2, "Linear equation revision checklist", "revision_notes", "Collect like terms, move variable terms to one side, isolate the variable, and substitute the answer back into the original equation."),
    ("a0000000-0000-0000-0000-000000000004", 3, "Important factorisation question", "important_questions", "Try factorising x² + 7x + 12 without expanding guesses. Look for two numbers whose product is 12 and whose sum is 7."),
]

TINY_PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")


def current_periods(now: datetime) -> dict[str, datetime | int]:
    local_now = now.astimezone(DHAKA)
    day_start = datetime.combine(local_now.date(), time.min, tzinfo=DHAKA)
    next_day = day_start + timedelta(days=1)
    week_start = day_start - timedelta(days=local_now.weekday())
    week_end = week_start + timedelta(days=7)
    month_start = day_start.replace(day=1)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)
    return {
        "day_start": day_start,
        "next_day": next_day,
        "week_start": week_start,
        "week_end": week_end,
        "month_start": month_start,
        "month_end": month_end,
        "week_number": local_now.isocalendar().week,
    }


async def seed_circle_helper(
    session,
    now: datetime,
    periods: dict,
    circle_id: UUID,
    name: str,
    description: str,
    streak_days: int,
    mission_progress: int,
    quest_progress: int,
    members: list[dict],
) -> None:
    # 1. Circle
    await session.merge(
        Circle(
            id=circle_id,
            name=name,
            class_level="class_10",
            subject="mathematics",
            description=description,
        )
    )
    await session.flush()

    # 2. Members (DemoUser and CircleMembership)
    for order, member in enumerate(members):
        await session.merge(
            DemoUser(
                id=member["id"],
                username=member["username"],
                display_name=member["display_name"],
                class_level="class_10",
                curriculum="nctb_bangla",
                preferred_subject="mathematics",
                school_name=None,
                access_key=member["access_key"],
                is_seed_fixture=True,
            )
        )
        await session.merge(
            CircleMembership(
                id=member["membership_id"],
                circle_id=circle_id,
                user_id=member["id"],
                weekly_points=member["weekly_points"],
                roadmap_position=member["roadmap_position"],
                personal_contribution=member["personal_contribution"],
                joined_at=now - timedelta(days=30 - order),
            )
        )

    # 3. CircleState
    await session.merge(
        CircleState(
            circle_id=circle_id,
            streak_days=streak_days,
            current_mentor_user_id=members[0]["id"],
            updated_at=now,
        )
    )

    # 4. WeeklyCycle
    cycle_id = UUID("6" + circle_id.hex[1:])
    await session.merge(
        WeeklyCycle(
            id=cycle_id,
            circle_id=circle_id,
            week_number=periods["week_number"],
            starts_at=periods["week_start"],
            ends_at=periods["week_end"],
            status="active",
        )
    )
    await session.flush()

    # 5. Mission & Quest
    mission_id = UUID("4" + circle_id.hex[1:])
    await session.merge(
        Mission(
            id=mission_id,
            circle_id=circle_id,
            title="Complete 50 roadmap activities together",
            target=50,
            progress=mission_progress,
            starts_at=periods["month_start"],
            ends_at=periods["month_end"],
            status="active",
        )
    )
    quest_id = UUID("5" + circle_id.hex[1:])
    await session.merge(
        DailyQuest(
            id=quest_id,
            circle_id=circle_id,
            local_date=periods["day_start"].date(),
            title="Complete 5 roadmap activities today",
            target=5,
            progress=quest_progress,
            completed_at=None,
        )
    )

    # 6. Roadmap & Checkpoints
    roadmap_id = UUID("7" + circle_id.hex[1:])
    await session.merge(
        Roadmap(
            id=roadmap_id,
            weekly_cycle_id=cycle_id,
            title="Algebra Foundations Week",
            status="published",
            published_at=periods["week_start"],
            created_by_user_id=members[0]["id"],
        )
    )
    await session.flush()

    checkpoints_data = [
        ("Review Algebra Basics", "review", "algebra_basics"),
        ("Explore Linear Equations", "lesson", "linear_equations"),
        ("Practice Quiz", "quiz", "linear_equations"),
        ("Review Common Mistakes", "review", "algebra_mistakes"),
        ("Weekly Algebra Challenge", "challenge", "weekly_challenge"),
    ]
    for position, (title, activity_type, topic_key) in enumerate(checkpoints_data):
        cp_id = UUID(f"c0000000-0000-0000-0000-{circle_id.hex[-10:]}{position:02d}")
        await session.merge(
            RoadmapCheckpoint(
                id=cp_id,
                roadmap_id=roadmap_id,
                position=position,
                title=title,
                activity_type=activity_type,
                topic_key=topic_key,
            )
        )


async def seed_phase_one(now: datetime | None = None) -> dict[str, int]:
    now = now or datetime.now(timezone.utc)
    periods = current_periods(now)

    pi_members = [
        {
            "id": UUID("10000000-0000-0000-0000-000000000006"),
            "membership_id": UUID("30000000-0000-0000-0000-000000000006"),
            "username": "sadia_fixture",
            "display_name": "Sadia",
            "access_key": "SC-SADA-2227",
            "weekly_points": 180,
            "roadmap_position": 3,
            "personal_contribution": 6,
        },
        {
            "id": UUID("10000000-0000-0000-0000-000000000007"),
            "membership_id": UUID("30000000-0000-0000-0000-000000000007"),
            "username": "tanvir_fixture",
            "display_name": "Tanvir",
            "access_key": "SC-TANV-2228",
            "weekly_points": 150,
            "roadmap_position": 2,
            "personal_contribution": 4,
        },
    ]

    eq_members = [
        {
            "id": UUID("10000000-0000-0000-0000-000000000008"),
            "membership_id": UUID("30000000-0000-0000-0000-000000000008"),
            "username": "munir_fixture",
            "display_name": "Munir",
            "access_key": "SC-MUNA-2229",
            "weekly_points": 220,
            "roadmap_position": 4,
            "personal_contribution": 7,
        },
        {
            "id": UUID("10000000-0000-0000-0000-000000000009"),
            "membership_id": UUID("30000000-0000-0000-0000-000000000009"),
            "username": "tasnim_fixture",
            "display_name": "Tasnim",
            "access_key": "SC-TASN-2232",
            "weekly_points": 110,
            "roadmap_position": 2,
            "personal_contribution": 3,
        },
    ]

    tri_members = [
        {
            "id": UUID("10000000-0000-0000-0000-000000000010"),
            "membership_id": UUID("30000000-0000-0000-0000-000000000010"),
            "username": "imran_fixture",
            "display_name": "Imran",
            "access_key": "SC-EMRA-2232",
            "weekly_points": 80,
            "roadmap_position": 1,
            "personal_contribution": 2,
        },
    ]

    async with AsyncSessionFactory() as session:
        await session.execute(
            update(Mission)
            .where(Mission.circle_id != MISSION_ID, Mission.status == "active")
            .values(status="archived")
        )
        await session.execute(
            update(WeeklyCycle)
            .where(WeeklyCycle.id != WEEKLY_CYCLE_ID, WeeklyCycle.status == "active")
            .values(status="archived")
        )

        # Seed Math Champions
        await seed_circle_helper(
            session, now, periods,
            CIRCLE_ID,
            "Math Champions",
            "A focused circle for Class 10 students building steady Mathematics momentum together.",
            7,
            31,
            2,
            PEERS
        )

        # Seed Pi Squad
        await seed_circle_helper(
            session, now, periods,
            UUID("20000000-0000-0000-0000-000000000002"),
            "Pi Squad",
            "Solving advanced equations and math challenges together.",
            5,
            20,
            1,
            pi_members
        )

        # Seed Equation Elites
        await seed_circle_helper(
            session, now, periods,
            UUID("20000000-0000-0000-0000-000000000003"),
            "Equation Elites",
            "Mastering formulas and algebraic proofs every week.",
            3,
            15,
            1,
            eq_members
        )

        # Seed Trigonometry Titans
        await seed_circle_helper(
            session, now, periods,
            UUID("20000000-0000-0000-0000-000000000004"),
            "Trigonometry Titans",
            "Tackling geometry and trigonometric identities together.",
            2,
            5,
            1,
            tri_members
        )

        # Seed Activity Events for Math Champions (retains original tests compatibility)
        seeded_events = [
            ActivityEvent(
                id=UUID("90000000-0000-0000-0000-000000000001"),
                circle_id=CIRCLE_ID,
                actor_user_id=PEERS[0]["id"],
                event_type="checkpoint_completed",
                payload={"checkpoint_title": "Review Common Mistakes", "checkpoint_position": 3},
                dedupe_key="seed:nabila:checkpoint:3",
                created_at=now - timedelta(minutes=45),
            ),
            ActivityEvent(
                id=UUID("90000000-0000-0000-0000-000000000002"),
                circle_id=CIRCLE_ID,
                actor_user_id=PEERS[1]["id"],
                event_type="checkpoint_completed",
                payload={"checkpoint_title": "Practice Quiz", "checkpoint_position": 2},
                dedupe_key="seed:rafi:checkpoint:2",
                created_at=now - timedelta(hours=2),
            ),
            ActivityEvent(
                id=UUID("90000000-0000-0000-0000-000000000003"),
                circle_id=CIRCLE_ID,
                actor_user_id=PEERS[2]["id"],
                event_type="rank_changed",
                payload={"rank": 3},
                dedupe_key="seed:samia:rank:3",
                created_at=now - timedelta(hours=4),
            ),
        ]
        for event in seeded_events:
            await session.merge(event)

        for index, (note_id, author_index, title, category, content) in enumerate(SEEDED_NOTES):
            await session.merge(
                Note(
                    id=UUID(note_id),
                    circle_id=CIRCLE_ID,
                    author_user_id=PEERS[author_index]["id"],
                    title=title,
                    category=category,
                    content_type="text",
                    text_content=content,
                    idempotency_key=f"seed-note-{index + 1}",
                    created_at=now - timedelta(hours=6 + index),
                )
            )
            await session.merge(
                ActivityEvent(
                    id=UUID(f"b0000000-0000-0000-0000-{index + 1:012d}"),
                    circle_id=CIRCLE_ID,
                    actor_user_id=PEERS[author_index]["id"],
                    event_type="note_created",
                    payload={"note_id": note_id, "title": title, "category": category, "content_type": "text"},
                    dedupe_key=f"seed:note:{index + 1}:created",
                    created_at=now - timedelta(hours=6 + index),
                )
            )

        image_note_id = UUID("a0000000-0000-0000-0000-000000000005")
        await session.merge(
            Note(
                id=image_note_id,
                circle_id=CIRCLE_ID,
                author_user_id=PEERS[4]["id"],
                title="Algebra identity card",
                category="chapter_2",
                content_type="image",
                image_bytes=TINY_PNG,
                image_mime_type="image/png",
                image_size=len(TINY_PNG),
                idempotency_key="seed-note-5",
                created_at=now - timedelta(hours=11),
            )
        )
        await session.merge(
            ActivityEvent(
                id=UUID("b0000000-0000-0000-0000-000000000005"),
                circle_id=CIRCLE_ID,
                actor_user_id=PEERS[4]["id"],
                event_type="note_created",
                payload={"note_id": str(image_note_id), "title": "Algebra identity card", "category": "chapter_2", "content_type": "image"},
                dedupe_key="seed:note:5:created",
                created_at=now - timedelta(hours=11),
            )
        )

        await session.commit()

        # Let's count totals
        return {
            "circles": await session.scalar(select(func.count()).select_from(Circle)),
            "fixture_users": await session.scalar(
                select(func.count()).select_from(DemoUser).where(DemoUser.is_seed_fixture.is_(True))
            ),
            "memberships": await session.scalar(
                select(func.count()).select_from(CircleMembership).where(CircleMembership.circle_id == CIRCLE_ID)
            ),
            "checkpoints": await session.scalar(
                select(func.count()).select_from(RoadmapCheckpoint).where(RoadmapCheckpoint.roadmap_id == ROADMAP_ID)
            ),
            "activity_events": await session.scalar(
                select(func.count()).select_from(ActivityEvent).where(ActivityEvent.circle_id == CIRCLE_ID)
            ),
            "notes": await session.scalar(
                select(func.count()).select_from(Note).where(Note.circle_id == CIRCLE_ID)
            ),
        }


async def verify_and_seed() -> None:
    async with engine.connect() as connection:
        database_name = await connection.scalar(text("SELECT current_database()"))
        table_name = await connection.scalar(text("SELECT to_regclass('public.circles')::text"))
        revision = await connection.scalar(text("SELECT version_num FROM alembic_version LIMIT 1"))
    if table_name != "circles":
        raise SystemExit("Circle tables are missing; run `alembic upgrade head` first.")

    counts = await seed_phase_one()
    summary = ", ".join(f"{key}={value}" for key, value in counts.items())
    print(f"StudyCircle ready: database={database_name}, revision={revision}, {summary}")


def main() -> None:
    asyncio.run(verify_and_seed())


if __name__ == "__main__":
    main()

