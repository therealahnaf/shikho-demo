from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import AppError
from app.models import (
    ActivityCompletion,
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
    ActivityCompletionView,
    ActivityEventView,
    ActivityFeedResponse,
    CheckpointView,
    CircleStreakView,
    CircleSummary,
    CompletionResponse,
    DailyQuestView,
    LeaderboardEntry,
    LeaderboardResponse,
    MemberPositionView,
    MissionView,
    RoadmapDetailResponse,
    RoadmapPreview,
    WeeklyCycleView,
)
from app.services.circles import member_user, membership_summary

DHAKA = ZoneInfo("Asia/Dhaka")
POINTS_PER_COMPLETION = 30


def _ranked_rows(
    rows: list[tuple[CircleMembership, DemoUser]],
) -> list[tuple[CircleMembership, DemoUser]]:
    return sorted(
        rows,
        key=lambda row: (
            -row[0].weekly_points,
            row[0].joined_at,
            str(row[0].user_id),
        ),
    )


def _rank_for(
    rows: list[tuple[CircleMembership, DemoUser]], user_id: uuid.UUID
) -> int:
    return next(
        rank
        for rank, (membership, _) in enumerate(_ranked_rows(rows), start=1)
        if membership.user_id == user_id
    )


def _checkpoint_view(
    checkpoint: RoadmapCheckpoint, roadmap_position: int
) -> CheckpointView:
    return CheckpointView(
        id=checkpoint.id,
        position=checkpoint.position,
        title=checkpoint.title,
        activity_type=checkpoint.activity_type,
        topic_key=checkpoint.topic_key,
        status=(
            "completed"
            if checkpoint.position < roadmap_position
            else "current"
            if checkpoint.position == roadmap_position
            else "locked"
        ),
    )


def _next_midnight_seconds(now: datetime) -> int:
    local_now = now.astimezone(DHAKA)
    next_midnight = datetime.combine(
        local_now.date() + timedelta(days=1), time.min, tzinfo=DHAKA
    )
    return max(0, int((next_midnight - local_now).total_seconds()))


async def _circle_and_membership(
    session: AsyncSession, user: DemoUser, circle_id: uuid.UUID
) -> tuple[Circle, CircleMembership]:
    circle = await session.get(Circle, circle_id)
    if circle is None:
        raise AppError(
            status_code=404,
            code="circle_not_found",
            message="StudyCircle not found.",
        )
    membership = await session.scalar(
        select(CircleMembership).where(
            CircleMembership.circle_id == circle_id,
            CircleMembership.user_id == user.id,
        )
    )
    if membership is None:
        raise AppError(
            status_code=403,
            code="circle_membership_required",
            message="Join this StudyCircle to continue.",
        )
    return circle, membership


async def _active_roadmap(
    session: AsyncSession, circle_id: uuid.UUID
) -> tuple[WeeklyCycle, Roadmap, list[RoadmapCheckpoint]]:
    cycle = await session.scalar(
        select(WeeklyCycle).where(
            WeeklyCycle.circle_id == circle_id,
            WeeklyCycle.status == "active",
        )
    )
    roadmap = (
        await session.scalar(
            select(Roadmap).where(
                Roadmap.weekly_cycle_id == cycle.id,
                Roadmap.status == "published",
            )
        )
        if cycle
        else None
    )
    if cycle is None or roadmap is None:
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
    return cycle, roadmap, checkpoints


async def roadmap_detail(
    session: AsyncSession, user: DemoUser, circle_id: uuid.UUID
) -> RoadmapDetailResponse:
    circle, membership = await _circle_and_membership(session, user, circle_id)
    cycle, roadmap, checkpoints = await _active_roadmap(session, circle_id)
    member_rows = list(
        (
            await session.execute(
                select(CircleMembership, DemoUser)
                .join(DemoUser, DemoUser.id == CircleMembership.user_id)
                .where(CircleMembership.circle_id == circle_id)
            )
        ).all()
    )
    views = [
        _checkpoint_view(checkpoint, membership.roadmap_position)
        for checkpoint in checkpoints
    ]
    next_checkpoint = next(
        (item for item in views if item.status == "current"), None
    )
    return RoadmapDetailResponse(
        circle=CircleSummary(
            id=circle.id,
            name=circle.name,
            class_level=circle.class_level,
            subject=circle.subject,
            description=circle.description,
            member_count=len(member_rows),
        ),
        membership=membership_summary(membership, circle),
        cycle=WeeklyCycleView(
            id=cycle.id, starts_at=cycle.starts_at, ends_at=cycle.ends_at
        ),
        roadmap=RoadmapPreview(
            id=roadmap.id,
            title=roadmap.title,
            starts_at=cycle.starts_at,
            ends_at=cycle.ends_at,
            checkpoints=views,
            member_positions=[
                MemberPositionView(
                    user=member_user(member_record),
                    position=member.roadmap_position,
                )
                for member, member_record in member_rows
            ],
        ),
        next_checkpoint=next_checkpoint,
    )


async def full_leaderboard(
    session: AsyncSession, user: DemoUser, circle_id: uuid.UUID
) -> LeaderboardResponse:
    circle, _ = await _circle_and_membership(session, user, circle_id)
    cycle, _, _ = await _active_roadmap(session, circle_id)
    state = await session.get(CircleState, circle_id)
    if state is None:
        raise AppError(
            status_code=503,
            code="circle_not_ready",
            message="StudyCircle is being prepared. Please try again shortly.",
        )
    rows = list(
        (
            await session.execute(
                select(CircleMembership, DemoUser)
                .join(DemoUser, DemoUser.id == CircleMembership.user_id)
                .where(CircleMembership.circle_id == circle_id)
            )
        ).all()
    )
    ranked = _ranked_rows(rows)
    mentor = (
        await session.get(DemoUser, state.current_mentor_user_id)
        if state.current_mentor_user_id
        else None
    )
    entries = [
        LeaderboardEntry(
            rank=rank,
            user=member_user(member_record),
            weekly_points=membership.weekly_points,
            is_current_user=membership.user_id == user.id,
            is_mentor=membership.user_id == state.current_mentor_user_id,
        )
        for rank, (membership, member_record) in enumerate(ranked, start=1)
    ]
    return LeaderboardResponse(
        circle=CircleSummary(
            id=circle.id,
            name=circle.name,
            class_level=circle.class_level,
            subject=circle.subject,
            description=circle.description,
            member_count=len(rows),
        ),
        cycle=WeeklyCycleView(
            id=cycle.id, starts_at=cycle.starts_at, ends_at=cycle.ends_at
        ),
        entries=entries,
        current_user_rank=next(
            entry.rank for entry in entries if entry.is_current_user
        ),
        mentor=member_user(mentor) if mentor else None,
    )


async def activity_feed(
    session: AsyncSession,
    user: DemoUser,
    circle_id: uuid.UUID,
    limit: int,
) -> ActivityFeedResponse:
    await _circle_and_membership(session, user, circle_id)
    rows = list(
        (
            await session.execute(
                select(ActivityEvent, DemoUser)
                .outerjoin(DemoUser, DemoUser.id == ActivityEvent.actor_user_id)
                .where(ActivityEvent.circle_id == circle_id)
                .order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
                .limit(limit)
            )
        ).all()
    )
    return ActivityFeedResponse(
        events=[
            ActivityEventView(
                id=event.id,
                event_type=event.event_type,
                actor=member_user(actor) if actor else None,
                payload=event.payload,
                created_at=event.created_at,
            )
            for event, actor in rows
        ]
    )


async def complete_checkpoint(
    session: AsyncSession,
    user: DemoUser,
    circle_id: uuid.UUID,
    checkpoint_id: uuid.UUID,
) -> CompletionResponse:
    circle, _ = await _circle_and_membership(session, user, circle_id)
    cycle, roadmap, checkpoints = await _active_roadmap(session, circle_id)
    checkpoint = next(
        (item for item in checkpoints if item.id == checkpoint_id), None
    )
    if checkpoint is None or checkpoint.roadmap_id != roadmap.id:
        raise AppError(
            status_code=404,
            code="checkpoint_not_found",
            message="Roadmap checkpoint not found.",
        )

    locked_rows = list(
        (
            await session.execute(
                select(CircleMembership, DemoUser)
                .join(DemoUser, DemoUser.id == CircleMembership.user_id)
                .where(CircleMembership.circle_id == circle_id)
                .order_by(CircleMembership.user_id)
                .with_for_update(of=CircleMembership)
            )
        ).all()
    )
    membership = next(
        (item for item, _ in locked_rows if item.user_id == user.id), None
    )
    if membership is None:
        raise AppError(
            status_code=403,
            code="circle_membership_required",
            message="Join this StudyCircle to continue.",
        )

    existing = await session.scalar(
        select(ActivityCompletion).where(
            ActivityCompletion.weekly_cycle_id == cycle.id,
            ActivityCompletion.roadmap_checkpoint_id == checkpoint.id,
            ActivityCompletion.user_id == user.id,
        )
    )
    if existing is not None:
        raise AppError(
            status_code=409,
            code="checkpoint_already_completed",
            message="This checkpoint has already been completed.",
        )
    if checkpoint.position != membership.roadmap_position:
        raise AppError(
            status_code=409,
            code="checkpoint_locked",
            message="Complete the current roadmap checkpoint first.",
        )

    now = datetime.now(timezone.utc)
    local_date = now.astimezone(DHAKA).date()
    mission = await session.scalar(
        select(Mission)
        .where(Mission.circle_id == circle_id, Mission.status == "active")
        .with_for_update()
    )
    quest = await session.scalar(
        select(DailyQuest)
        .where(
            DailyQuest.circle_id == circle_id,
            DailyQuest.local_date == local_date,
        )
        .with_for_update()
    )
    state = await session.scalar(
        select(CircleState)
        .where(CircleState.circle_id == circle_id)
        .with_for_update()
    )
    if mission is None or quest is None or state is None:
        raise AppError(
            status_code=503,
            code="circle_not_ready",
            message="StudyCircle is being prepared. Please try again shortly.",
        )

    previous_rank = _rank_for(locked_rows, user.id)
    completion = ActivityCompletion(
        id=uuid.uuid4(),
        circle_id=circle_id,
        weekly_cycle_id=cycle.id,
        roadmap_checkpoint_id=checkpoint.id,
        user_id=user.id,
        activity_type=checkpoint.activity_type,
        points_awarded=POINTS_PER_COMPLETION,
        completed_at=now,
    )
    session.add(completion)

    membership.weekly_points += POINTS_PER_COMPLETION
    membership.personal_contribution += 1
    membership.roadmap_position += 1
    mission.progress = min(mission.target, mission.progress + 1)

    quest_was_complete = quest.completed_at is not None or quest.progress >= quest.target
    quest.progress = min(quest.target, quest.progress + 1)
    streak_increased = not quest_was_complete and quest.progress >= quest.target
    if streak_increased:
        quest.completed_at = now
        previous_streak = state.streak_days
        state.streak_days += 1
        state.updated_at = now
    else:
        previous_streak = state.streak_days

    current_rank = _rank_for(locked_rows, user.id)
    checkpoint_payload = {
        "checkpoint_id": str(checkpoint.id),
        "checkpoint_title": checkpoint.title,
        "checkpoint_position": checkpoint.position,
        "activity_type": checkpoint.activity_type,
        "points_awarded": POINTS_PER_COMPLETION,
        "actor_display_name": user.display_name,
    }
    events = [
        ActivityEvent(
            id=uuid.uuid4(),
            circle_id=circle_id,
            actor_user_id=user.id,
            event_type="checkpoint_completed",
            payload=checkpoint_payload,
            dedupe_key=f"completion:{completion.id}",
            created_at=now,
        )
    ]
    if current_rank != previous_rank:
        events.append(
            ActivityEvent(
                id=uuid.uuid4(),
                circle_id=circle_id,
                actor_user_id=user.id,
                event_type="rank_changed",
                payload={
                    "previous_rank": previous_rank,
                    "rank": current_rank,
                    "weekly_points": membership.weekly_points,
                    "actor_display_name": user.display_name,
                },
                dedupe_key=(
                    f"rank:{completion.id}:{previous_rank}:{current_rank}"
                ),
                created_at=now,
            )
        )
    if streak_increased:
        events.extend(
            [
                ActivityEvent(
                    id=uuid.uuid4(),
                    circle_id=circle_id,
                    actor_user_id=None,
                    event_type="daily_quest_completed",
                    payload={
                        "quest_id": str(quest.id),
                        "quest_title": quest.title,
                        "progress": quest.progress,
                        "target": quest.target,
                    },
                    dedupe_key=f"quest-complete:{quest.id}",
                    created_at=now,
                ),
                ActivityEvent(
                    id=uuid.uuid4(),
                    circle_id=circle_id,
                    actor_user_id=None,
                    event_type="streak_increased",
                    payload={
                        "quest_id": str(quest.id),
                        "previous_days": previous_streak,
                        "days": state.streak_days,
                    },
                    dedupe_key=f"streak:{quest.id}",
                    created_at=now,
                ),
            ]
        )
    session.add_all(events)
    await session.commit()

    next_checkpoint_model = next(
        (
            item
            for item in checkpoints
            if item.position == membership.roadmap_position
        ),
        None,
    )
    return CompletionResponse(
        completion=ActivityCompletionView(
            id=completion.id,
            checkpoint_id=checkpoint.id,
            activity_type=checkpoint.activity_type,
            points_awarded=completion.points_awarded,
            completed_at=completion.completed_at,
        ),
        points_added=POINTS_PER_COMPLETION,
        previous_rank=previous_rank,
        current_rank=current_rank,
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
            time_remaining_seconds=_next_midnight_seconds(now),
        ),
        streak=CircleStreakView(days=state.streak_days),
        streak_increased=streak_increased,
        next_checkpoint=(
            _checkpoint_view(next_checkpoint_model, membership.roadmap_position)
            if next_checkpoint_model
            else None
        ),
    )
