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
    MentorTerm,
    Mission,
    Note,
    NoteReaction,
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
    MentorTermView,
    WorkspaceTopic,
    WorkspaceNote,
    PlannedCheckpoint,
    PlannedRoadmapView,
    MentorWorkspaceResponse,
    PublishRoadmapRequest,
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
        select(WeeklyCycle).where(
            WeeklyCycle.circle_id == circle.id,
            WeeklyCycle.status.in_(["active", "finalized"]),
        )
    )
    planned_cycle = await session.scalar(
        select(WeeklyCycle).where(
            WeeklyCycle.circle_id == circle.id,
            WeeklyCycle.status == "planned",
        )
    )
    next_roadmap_published = planned_cycle is not None
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
        cycle_status=cycle.status,
        next_roadmap_published=next_roadmap_published,
    )


TOPIC_NAMES = {
    "algebra_basics": "Algebra Basics",
    "linear_equations": "Linear Equations",
    "geometry": "Geometry",
    "trigonometry": "Trigonometry",
    "revision": "Revision"
}

def generate_checkpoint_title(topic_key: str, activity_type: str) -> str:
    topic_name = TOPIC_NAMES.get(topic_key, topic_key.replace("_", " ").title())
    if activity_type == "review":
        return f"Review {topic_name}"
    elif activity_type == "lesson":
        return f"Explore {topic_name}"
    elif activity_type == "quiz":
        if topic_key == "linear_equations":
            return "Practice Quiz"
        return f"Practice Quiz: {topic_name}"
    elif activity_type == "challenge":
        if topic_key == "weekly_challenge" or topic_key == "revision":
            return "Weekly Algebra Challenge"
        return f"Weekly {topic_name} Challenge"
    return f"{activity_type.title()} {topic_name}"


async def finalize_week(
    session: AsyncSession, user: DemoUser, circle_id: uuid.UUID
) -> MentorTermView:
    active_cycle = await session.scalar(
        select(WeeklyCycle)
        .where(WeeklyCycle.circle_id == circle_id, WeeklyCycle.status == "active")
        .with_for_update()
    )
    if active_cycle is None:
        raise AppError(
            status_code=404,
            code="no_active_cycle",
            message="No active weekly cycle found for this circle.",
        )

    existing_term = await session.scalar(
        select(MentorTerm).where(MentorTerm.weekly_cycle_id == active_cycle.id)
    )
    if existing_term is not None:
        return MentorTermView(
            id=existing_term.id,
            circle_id=existing_term.circle_id,
            weekly_cycle_id=existing_term.weekly_cycle_id,
            mentor_user_id=existing_term.mentor_user_id,
            final_rank=existing_term.final_rank,
            final_points=existing_term.final_points,
            selected_at=existing_term.selected_at,
        )

    result = await session.execute(
        select(CircleMembership, DemoUser)
        .join(DemoUser, DemoUser.id == CircleMembership.user_id)
        .where(CircleMembership.circle_id == circle_id)
        .with_for_update()
    )
    member_rows = list(result.all())
    if not member_rows:
        raise AppError(
            status_code=400,
            code="no_members",
            message="The circle has no members to select a mentor from.",
        )

    member_rows.sort(
        key=lambda row: (-row[0].weekly_points, row[0].joined_at, str(row[0].user_id))
    )
    winner_membership, winner_user = member_rows[0]

    mentor_term = MentorTerm(
        id=uuid.uuid4(),
        circle_id=circle_id,
        weekly_cycle_id=active_cycle.id,
        mentor_user_id=winner_user.id,
        final_rank=1,
        final_points=winner_membership.weekly_points,
    )
    session.add(mentor_term)

    state = await session.scalar(
        select(CircleState).where(CircleState.circle_id == circle_id).with_for_update()
    )
    if state:
        state.current_mentor_user_id = winner_user.id
    active_cycle.status = "finalized"

    await session.execute(
        pg_insert(ActivityEvent)
        .values(
            id=uuid.uuid4(),
            circle_id=circle_id,
            actor_user_id=winner_user.id,
            event_type="mentor_selected",
            payload={
                "mentor_name": winner_user.display_name,
                "points": winner_membership.weekly_points,
            },
            dedupe_key=f"mentor_selected:{circle_id}:{active_cycle.id}",
        )
        .on_conflict_do_nothing(index_elements=["dedupe_key"])
    )

    await session.commit()

    return MentorTermView(
        id=mentor_term.id,
        circle_id=mentor_term.circle_id,
        weekly_cycle_id=mentor_term.weekly_cycle_id,
        mentor_user_id=mentor_term.mentor_user_id,
        final_rank=mentor_term.final_rank,
        final_points=mentor_term.final_points,
        selected_at=mentor_term.selected_at,
    )


async def get_mentor_workspace(
    session: AsyncSession, user: DemoUser, circle_id: uuid.UUID
) -> MentorWorkspaceResponse:
    state = await session.get(CircleState, circle_id)
    if not state or state.current_mentor_user_id != user.id:
        raise AppError(
            status_code=403,
            code="not_mentor",
            message="Only the weekly Mentor can access the Mentor Workspace.",
        )

    finalized_cycle = await session.scalar(
        select(WeeklyCycle).where(
            WeeklyCycle.circle_id == circle_id, WeeklyCycle.status == "finalized"
        )
    )
    if finalized_cycle is None:
        raise AppError(
            status_code=400,
            code="week_not_finalized",
            message="The current week must be finalized first.",
        )

    term = await session.scalar(
        select(MentorTerm).where(MentorTerm.weekly_cycle_id == finalized_cycle.id)
    )
    if term is None:
        raise AppError(
            status_code=404,
            code="mentor_term_not_found",
            message="No mentor term found for the finalized cycle.",
        )

    notes_result = await session.execute(
        select(
            Note,
            DemoUser.display_name,
            func.count(NoteReaction.id).label("helpful_count"),
        )
        .join(DemoUser, DemoUser.id == Note.author_user_id)
        .outerjoin(NoteReaction, NoteReaction.note_id == Note.id)
        .where(Note.circle_id == circle_id)
        .group_by(Note.id, DemoUser.id)
        .order_by(Note.created_at.desc())
    )
    workspace_notes = [
        WorkspaceNote(
            id=note.id,
            title=note.title,
            category=note.category,
            author_name=author_name,
            helpful_count=helpful_count,
        )
        for note, author_name, helpful_count in notes_result
    ]

    planned_roadmap = None
    planned_cycle = await session.scalar(
        select(WeeklyCycle).where(
            WeeklyCycle.circle_id == circle_id, WeeklyCycle.status == "planned"
        )
    )
    if planned_cycle:
        planned_rm = await session.scalar(
            select(Roadmap).where(Roadmap.weekly_cycle_id == planned_cycle.id)
        )
        if planned_rm:
            planned_checkpoints = list(
                (
                    await session.scalars(
                        select(RoadmapCheckpoint)
                        .where(RoadmapCheckpoint.roadmap_id == planned_rm.id)
                        .order_by(RoadmapCheckpoint.position)
                    )
                ).all()
            )
            planned_roadmap = PlannedRoadmapView(
                title=planned_rm.title,
                mentor_pick_note_id=planned_rm.mentor_pick_note_id,
                checkpoints=[
                    PlannedCheckpoint(
                        topic_key=cp.topic_key, activity_type=cp.activity_type
                    )
                    for cp in planned_checkpoints
                ],
            )

    topics = [
        WorkspaceTopic(key="algebra_basics", name="Algebra Basics"),
        WorkspaceTopic(key="linear_equations", name="Linear Equations"),
        WorkspaceTopic(key="geometry", name="Geometry"),
        WorkspaceTopic(key="trigonometry", name="Trigonometry"),
        WorkspaceTopic(key="revision", name="Revision"),
    ]

    return MentorWorkspaceResponse(
        current_term=MentorTermView(
            id=term.id,
            circle_id=term.circle_id,
            weekly_cycle_id=term.weekly_cycle_id,
            mentor_user_id=term.mentor_user_id,
            final_rank=term.final_rank,
            final_points=term.final_points,
            selected_at=term.selected_at,
        ),
        topics=topics,
        activity_types=["review", "lesson", "quiz", "challenge"],
        notes=workspace_notes,
        planned_roadmap=planned_roadmap,
    )


async def publish_next_roadmap(
    session: AsyncSession,
    user: DemoUser,
    circle_id: uuid.UUID,
    request: PublishRoadmapRequest,
) -> PlannedRoadmapView:
    state = await session.get(CircleState, circle_id)
    if not state or state.current_mentor_user_id != user.id:
        raise AppError(
            status_code=403,
            code="not_mentor",
            message="Only the weekly Mentor can publish next week's roadmap.",
        )

    finalized_cycle = await session.scalar(
        select(WeeklyCycle)
        .where(
            WeeklyCycle.circle_id == circle_id, WeeklyCycle.status == "finalized"
        )
        .with_for_update()
    )
    if finalized_cycle is None:
        raise AppError(
            status_code=400,
            code="week_not_finalized",
            message="The current week must be finalized first.",
        )

    if not (5 <= len(request.title) <= 80):
        raise AppError(
            status_code=422,
            code="invalid_title",
            message="Roadmap title must be between 5 and 80 characters.",
        )

    if not (3 <= len(request.checkpoints) <= 5):
        raise AppError(
            status_code=422,
            code="invalid_checkpoints_count",
            message="Roadmap must contain exactly 3 to 5 checkpoints.",
        )

    if request.mentor_pick_note_id:
        note_exists = await session.scalar(
            select(Note).where(
                Note.id == request.mentor_pick_note_id,
                Note.circle_id == circle_id,
            )
        )
        if not note_exists:
            raise AppError(
                status_code=400,
                code="invalid_note",
                message="Mentor's pick note is invalid or belongs to another circle.",
            )

    planned_cycle = await session.scalar(
        select(WeeklyCycle)
        .where(
            WeeklyCycle.circle_id == circle_id, WeeklyCycle.status == "planned"
        )
        .with_for_update()
    )
    if planned_cycle is not None:
        planned_rm = await session.scalar(
            select(Roadmap).where(Roadmap.weekly_cycle_id == planned_cycle.id)
        )
        if planned_rm:
            planned_checkpoints = list(
                (
                    await session.scalars(
                        select(RoadmapCheckpoint)
                        .where(RoadmapCheckpoint.roadmap_id == planned_rm.id)
                        .order_by(RoadmapCheckpoint.position)
                    )
                ).all()
            )
            return PlannedRoadmapView(
                title=planned_rm.title,
                mentor_pick_note_id=planned_rm.mentor_pick_note_id,
                checkpoints=[
                    PlannedCheckpoint(
                        topic_key=cp.topic_key, activity_type=cp.activity_type
                    )
                    for cp in planned_checkpoints
                ],
            )
        raise AppError(
            status_code=400,
            code="roadmap_already_published",
            message="Next week's roadmap has already been published.",
        )

    starts_at = finalized_cycle.ends_at
    ends_at = starts_at + timedelta(days=7)
    week_number = starts_at.astimezone(DHAKA).isocalendar().week

    planned_cycle = WeeklyCycle(
        id=uuid.uuid4(),
        circle_id=circle_id,
        week_number=week_number,
        starts_at=starts_at,
        ends_at=ends_at,
        status="planned",
    )
    session.add(planned_cycle)
    await session.flush()

    roadmap = Roadmap(
        id=uuid.uuid4(),
        weekly_cycle_id=planned_cycle.id,
        title=request.title,
        status="published",
        published_at=datetime.now(timezone.utc),
        created_by_user_id=user.id,
        mentor_pick_note_id=request.mentor_pick_note_id,
    )
    session.add(roadmap)
    await session.flush()

    for position, cp in enumerate(request.checkpoints):
        title = generate_checkpoint_title(cp.topic_key, cp.activity_type)
        checkpoint = RoadmapCheckpoint(
            id=uuid.uuid4(),
            roadmap_id=roadmap.id,
            position=position,
            title=title,
            activity_type=cp.activity_type,
            topic_key=cp.topic_key,
        )
        session.add(checkpoint)

    await session.execute(
        pg_insert(ActivityEvent)
        .values(
            id=uuid.uuid4(),
            circle_id=circle_id,
            actor_user_id=user.id,
            event_type="roadmap_published",
            payload={
                "roadmap_title": request.title,
                "mentor_name": user.display_name,
            },
            dedupe_key=f"roadmap_published:{circle_id}:{finalized_cycle.id}",
        )
        .on_conflict_do_nothing(index_elements=["dedupe_key"])
    )

    await session.commit()

    return PlannedRoadmapView(
        title=request.title,
        mentor_pick_note_id=request.mentor_pick_note_id,
        checkpoints=[
            PlannedCheckpoint(
                topic_key=cp.topic_key, activity_type=cp.activity_type
            )
            for cp in request.checkpoints
        ],
    )


async def start_next_week(
    session: AsyncSession, user: DemoUser, circle_id: uuid.UUID
) -> CircleHomeResponse:
    finalized_cycle = await session.scalar(
        select(WeeklyCycle)
        .where(
            WeeklyCycle.circle_id == circle_id,
            WeeklyCycle.status == "finalized",
        )
        .with_for_update()
    )
    if finalized_cycle is None:
        raise AppError(
            status_code=400,
            code="week_not_finalized",
            message="The current week must be finalized first.",
        )

    planned_cycle = await session.scalar(
        select(WeeklyCycle)
        .where(
            WeeklyCycle.circle_id == circle_id, WeeklyCycle.status == "planned"
        )
        .with_for_update()
    )
    if planned_cycle is None:
        active_cycle = await session.scalar(
            select(WeeklyCycle).where(
                WeeklyCycle.circle_id == circle_id, WeeklyCycle.status == "active"
            )
        )
        if active_cycle and active_cycle.starts_at == finalized_cycle.ends_at:
            return await circle_home(session, user, circle_id)
        raise AppError(
            status_code=400,
            code="roadmap_not_published",
            message="Next week's roadmap has not been published yet.",
        )

    finalized_cycle.status = "archived"
    planned_cycle.status = "active"

    memberships = (
        await session.scalars(
            select(CircleMembership)
            .where(CircleMembership.circle_id == circle_id)
            .with_for_update()
        )
    ).all()
    for member in memberships:
        member.weekly_points = 0
        member.roadmap_position = 0

    local_today = datetime.now(timezone.utc).astimezone(DHAKA).date()
    existing_quest = await session.scalar(
        select(DailyQuest)
        .where(
            DailyQuest.circle_id == circle_id, DailyQuest.local_date == local_today
        )
        .with_for_update()
    )
    if not existing_quest:
        quest = DailyQuest(
            id=uuid.uuid4(),
            circle_id=circle_id,
            local_date=local_today,
            title="Complete 5 roadmap activities today",
            target=5,
            progress=0,
        )
        session.add(quest)

    await session.execute(
        pg_insert(ActivityEvent)
        .values(
            id=uuid.uuid4(),
            circle_id=circle_id,
            actor_user_id=user.id,
            event_type="week_started",
            payload={"week_number": planned_cycle.week_number},
            dedupe_key=f"week_started:{circle_id}:{planned_cycle.id}",
        )
        .on_conflict_do_nothing(index_elements=["dedupe_key"])
    )

    await session.commit()

    return await circle_home(session, user, circle_id)


def calculate_periods(now: datetime) -> dict[str, datetime | int]:
    local_now = now.astimezone(DHAKA)
    day_start = datetime.combine(local_now.date(), time.min, tzinfo=DHAKA)
    week_start = day_start - timedelta(days=local_now.weekday())
    week_end = week_start + timedelta(days=7)
    month_start = day_start.replace(day=1)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)
    return {
        "day_start": day_start,
        "week_start": week_start,
        "week_end": week_end,
        "month_start": month_start,
        "month_end": month_end,
        "week_number": local_now.isocalendar().week,
    }


async def list_circles_service(
    session: AsyncSession, user: DemoUser
) -> CircleLeaderboardResponse:
    from app.schemas.circle import CircleLeaderboardEntry, CircleLeaderboardResponse

    circles = (await session.scalars(
        select(Circle).where(
            Circle.class_level == user.class_level,
            Circle.subject == user.preferred_subject,
        )
    )).all()

    entries = []
    for circle in circles:
        member_count = await session.scalar(
            select(func.count()).select_from(CircleMembership).where(CircleMembership.circle_id == circle.id)
        ) or 0

        points = await session.scalar(
            select(func.sum(CircleMembership.weekly_points)).where(CircleMembership.circle_id == circle.id)
        ) or 0

        entries.append(
            CircleLeaderboardEntry(
                id=circle.id,
                name=circle.name,
                description=circle.description,
                member_count=member_count,
                points=points,
                class_level=circle.class_level,
                subject=circle.subject,
            )
        )

    entries.sort(key=lambda x: (-x.points, x.name))
    return CircleLeaderboardResponse(circles=entries)


async def create_circle_service(
    session: AsyncSession, user: DemoUser, name: str, description: str
) -> JoinCircleResponse:
    # 1. Create circle
    circle = Circle(
        id=uuid.uuid4(),
        name=name,
        description=description,
        class_level=user.class_level,
        subject=user.preferred_subject,
    )
    session.add(circle)
    await session.flush()

    # 2. Create membership for the creator
    membership = CircleMembership(
        id=uuid.uuid4(),
        circle_id=circle.id,
        user_id=user.id,
        weekly_points=0,
        roadmap_position=0,
        personal_contribution=0,
    )
    session.add(membership)
    await session.flush()

    # 3. Create CircleState
    state = CircleState(
        circle_id=circle.id,
        streak_days=1,
        current_mentor_user_id=user.id,
        updated_at=datetime.now(timezone.utc),
    )
    session.add(state)

    # 4. Create active cycle, mission, quest, roadmap, checkpoints
    now = datetime.now(timezone.utc)
    periods = calculate_periods(now)

    active_cycle = WeeklyCycle(
        id=uuid.uuid4(),
        circle_id=circle.id,
        week_number=periods["week_number"],
        starts_at=periods["week_start"],
        ends_at=periods["week_end"],
        status="active",
    )
    session.add(active_cycle)
    await session.flush()

    mission = Mission(
        id=uuid.uuid4(),
        circle_id=circle.id,
        title="Complete 50 roadmap activities together",
        target=50,
        progress=0,
        starts_at=periods["month_start"],
        ends_at=periods["month_end"],
        status="active",
    )
    session.add(mission)

    quest = DailyQuest(
        id=uuid.uuid4(),
        circle_id=circle.id,
        local_date=periods["day_start"].date(),
        title="Complete 5 roadmap activities today",
        target=5,
        progress=0,
    )
    session.add(quest)

    roadmap = Roadmap(
        id=uuid.uuid4(),
        weekly_cycle_id=active_cycle.id,
        title="Syllabus Foundations",
        status="published",
        published_at=periods["week_start"],
        created_by_user_id=user.id,
    )
    session.add(roadmap)
    await session.flush()

    checkpoints_to_add = [
        ("Review Algebra Basics", "review", "algebra_basics"),
        ("Explore Linear Equations", "lesson", "linear_equations"),
        ("Practice Quiz", "quiz", "linear_equations"),
    ]
    for position, (title, activity_type, topic_key) in enumerate(checkpoints_to_add):
        cp = RoadmapCheckpoint(
            id=uuid.uuid4(),
            roadmap_id=roadmap.id,
            position=position,
            title=title,
            activity_type=activity_type,
            topic_key=topic_key,
        )
        session.add(cp)

    event = ActivityEvent(
        id=uuid.uuid4(),
        circle_id=circle.id,
        actor_user_id=user.id,
        event_type="member_joined",
        payload={},
        dedupe_key=f"join:{circle.id}:{user.id}",
    )
    session.add(event)

    await session.commit()

    return JoinCircleResponse(
        membership=membership_summary(membership, circle),
        circle_home_path=f"/app/study-circle/{circle.id}",
    )



