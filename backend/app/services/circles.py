from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import AppError
from app.models import (
    ActivityEvent,
    Circle,
    CircleMembership,
    CircleState,
    DailyQuest,
    DemoUser,
    Mission,
    Roadmap,
    RoadmapCheckpoint,
    WeeklyCycle,
)
from app.schemas.circle import (
    ActivityEventView,
    CheckpointView,
    CircleHomeResponse,
    CircleRecommendation,
    CircleStreakView,
    CircleSummary,
    DailyQuestView,
    JoinCircleResponse,
    LeaderboardEntry,
    LeaderboardPreview,
    MemberPositionView,
    MemberUser,
    MembershipSummary,
    MissionPreview,
    MissionView,
    RecommendedCircleResponse,
    RoadmapPreview,
)

DHAKA = ZoneInfo("Asia/Dhaka")


def member_user(user: DemoUser) -> MemberUser:
    return MemberUser(id=user.id, username=user.username, display_name=user.display_name)


def membership_summary(
    membership: CircleMembership, circle: Circle
) -> MembershipSummary:
    return MembershipSummary(
        id=membership.id,
        circle_id=circle.id,
        circle_name=circle.name,
        weekly_points=membership.weekly_points,
        roadmap_position=membership.roadmap_position,
        personal_contribution=membership.personal_contribution,
        joined_at=membership.joined_at,
    )


async def recommended_circle(
    session: AsyncSession, user: DemoUser
) -> RecommendedCircleResponse:
    circle = await session.scalar(
        select(Circle).where(
            Circle.class_level == user.class_level,
            Circle.subject == user.preferred_subject,
        )
    )
    if circle is None:
        return RecommendedCircleResponse(
            data=None,
            reason="No StudyCircle is available for your current class and subject.",
        )
    mission = await session.scalar(
        select(Mission).where(Mission.circle_id == circle.id, Mission.status == "active")
    )
    if mission is None:
        return RecommendedCircleResponse(
            data=None, reason="This StudyCircle is not accepting members right now."
        )
    member_count = await session.scalar(
        select(func.count()).select_from(CircleMembership).where(CircleMembership.circle_id == circle.id)
    )
    return RecommendedCircleResponse(
        data=CircleRecommendation(
            id=circle.id,
            name=circle.name,
            class_level=circle.class_level,
            subject=circle.subject,
            description=circle.description,
            member_count=member_count or 0,
            mission=MissionPreview(title=mission.title, target=mission.target, progress=mission.progress),
        ),
        reason=None,
    )


async def current_membership(
    session: AsyncSession, user_id: uuid.UUID
) -> tuple[CircleMembership, Circle] | None:
    result = await session.execute(
        select(CircleMembership, Circle)
        .join(Circle, Circle.id == CircleMembership.circle_id)
        .where(CircleMembership.user_id == user_id)
        .order_by(CircleMembership.joined_at)
        .limit(1)
    )
    return result.first()


async def join_circle(
    session: AsyncSession, user: DemoUser, circle_id: uuid.UUID
) -> tuple[JoinCircleResponse, bool]:
    circle = await session.get(Circle, circle_id)
    if circle is None:
        raise AppError(status_code=404, code="circle_not_found", message="StudyCircle not found.")
    if circle.class_level != user.class_level or circle.subject != user.preferred_subject:
        raise AppError(
            status_code=403,
            code="circle_not_recommended",
            message="This StudyCircle does not match your current class and subject.",
        )

    membership_id = uuid.uuid4()
    inserted_id = await session.scalar(
        pg_insert(CircleMembership)
        .values(
            id=membership_id,
            circle_id=circle.id,
            user_id=user.id,
            weekly_points=0,
            roadmap_position=0,
            personal_contribution=0,
        )
        .on_conflict_do_nothing(index_elements=["circle_id", "user_id"])
        .returning(CircleMembership.id)
    )
    created = inserted_id is not None
    if created:
        await session.execute(
            pg_insert(ActivityEvent)
            .values(
                id=uuid.uuid4(),
                circle_id=circle.id,
                actor_user_id=user.id,
                event_type="member_joined",
                payload={},
                dedupe_key=f"join:{circle.id}:{user.id}",
            )
            .on_conflict_do_nothing(index_elements=["dedupe_key"])
        )
    await session.commit()

    membership = await session.scalar(
        select(CircleMembership).where(
            CircleMembership.circle_id == circle.id,
            CircleMembership.user_id == user.id,
        )
    )
    if membership is None:
        raise AppError(
            status_code=500,
            code="membership_unavailable",
            message="Could not load your StudyCircle membership.",
        )
    return (
        JoinCircleResponse(
            membership=membership_summary(membership, circle),
            circle_home_path=f"/app/study-circle/{circle.id}",
        ),
        created,
    )


async def circle_home(
    session: AsyncSession, user: DemoUser, circle_id: uuid.UUID
) -> CircleHomeResponse:
    circle = await session.get(Circle, circle_id)
    if circle is None:
        raise AppError(status_code=404, code="circle_not_found", message="StudyCircle not found.")
    membership = await session.scalar(
        select(CircleMembership).where(
            CircleMembership.circle_id == circle.id,
            CircleMembership.user_id == user.id,
        )
    )
    if membership is None:
        raise AppError(
            status_code=403,
            code="circle_membership_required",
            message="Join this StudyCircle to view its home.",
        )

    now = datetime.now(timezone.utc)
    local_now = now.astimezone(DHAKA)
    mission = await session.scalar(
        select(Mission).where(Mission.circle_id == circle.id, Mission.status == "active")
    )
    quest = await session.scalar(
        select(DailyQuest).where(
            DailyQuest.circle_id == circle.id,
            DailyQuest.local_date == local_now.date(),
        )
    )
    cycle = await session.scalar(
        select(WeeklyCycle).where(WeeklyCycle.circle_id == circle.id, WeeklyCycle.status == "active")
    )
    roadmap = (
        await session.scalar(
            select(Roadmap).where(Roadmap.weekly_cycle_id == cycle.id, Roadmap.status == "published")
        )
        if cycle
        else None
    )
    state = await session.get(CircleState, circle.id)
    if not all([mission, quest, cycle, roadmap, state]):
        raise AppError(
            status_code=503,
            code="circle_not_ready",
            message="StudyCircle is being prepared. Please try again shortly.",
        )

    checkpoints = list(
        (
            await session.scalars(
                select(RoadmapCheckpoint)
                .where(RoadmapCheckpoint.roadmap_id == roadmap.id)
                .order_by(RoadmapCheckpoint.position)
            )
        ).all()
    )
    member_rows = list(
        (
            await session.execute(
                select(CircleMembership, DemoUser)
                .join(DemoUser, DemoUser.id == CircleMembership.user_id)
                .where(CircleMembership.circle_id == circle.id)
            )
        ).all()
    )
    member_rows.sort(
        key=lambda row: (-row[0].weekly_points, row[0].joined_at, str(row[0].user_id))
    )
    mentor = await session.get(DemoUser, state.current_mentor_user_id) if state.current_mentor_user_id else None

    leaderboard_entries: list[LeaderboardEntry] = []
    current_rank = 0
    for rank, (member, member_record) in enumerate(member_rows, start=1):
        if member.user_id == user.id:
            current_rank = rank
        if rank <= 3 or member.user_id == user.id:
            leaderboard_entries.append(
                LeaderboardEntry(
                    rank=rank,
                    user=member_user(member_record),
                    weekly_points=member.weekly_points,
                    is_current_user=member.user_id == user.id,
                    is_mentor=member.user_id == state.current_mentor_user_id,
                )
            )

    event_rows = list(
        (
            await session.execute(
                select(ActivityEvent, DemoUser)
                .outerjoin(DemoUser, DemoUser.id == ActivityEvent.actor_user_id)
                .where(ActivityEvent.circle_id == circle.id)
                .order_by(ActivityEvent.created_at.desc())
                .limit(10)
            )
        ).all()
    )
    next_midnight = datetime.combine(local_now.date() + timedelta(days=1), time.min, tzinfo=DHAKA)

    return CircleHomeResponse(
        circle=CircleSummary(
            id=circle.id,
            name=circle.name,
            class_level=circle.class_level,
            subject=circle.subject,
            description=circle.description,
            member_count=len(member_rows),
        ),
        membership=membership_summary(membership, circle),
        mission=MissionView(
            title=mission.title,
            target=mission.target,
            progress=mission.progress,
            percent_complete=round(mission.progress / mission.target * 100),
            ends_at=mission.ends_at,
            student_contribution=membership.personal_contribution,
        ),
        daily_quest=DailyQuestView(
            title=quest.title,
            target=quest.target,
            progress=quest.progress,
            percent_complete=round(quest.progress / quest.target * 100),
            local_date=quest.local_date,
            is_complete=quest.progress >= quest.target,
            time_remaining_seconds=max(0, int((next_midnight - local_now).total_seconds())),
        ),
        streak=CircleStreakView(days=state.streak_days),
        mentor=member_user(mentor) if mentor else None,
        roadmap=RoadmapPreview(
            id=roadmap.id,
            title=roadmap.title,
            starts_at=cycle.starts_at,
            ends_at=cycle.ends_at,
            checkpoints=[
                CheckpointView(
                    id=checkpoint.id,
                    position=checkpoint.position,
                    title=checkpoint.title,
                    activity_type=checkpoint.activity_type,
                    topic_key=checkpoint.topic_key,
                    status=(
                        "completed"
                        if checkpoint.position < membership.roadmap_position
                        else "current"
                        if checkpoint.position == membership.roadmap_position
                        else "locked"
                    ),
                )
                for checkpoint in checkpoints
            ],
            member_positions=[
                MemberPositionView(user=member_user(member_record), position=member.roadmap_position)
                for member, member_record in member_rows
            ],
        ),
        leaderboard=LeaderboardPreview(entries=leaderboard_entries, current_user_rank=current_rank),
        activity_feed=[
            ActivityEventView(
                id=event.id,
                event_type=event.event_type,
                actor=member_user(actor) if actor else None,
                payload=event.payload,
                created_at=event.created_at,
            )
            for event, actor in event_rows
        ],
    )

