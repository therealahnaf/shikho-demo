from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_demo_user
from app.db import get_db
from app.models import DemoUser
from app.schemas.circle import (
    ActivityFeedResponse,
    CircleHomeResponse,
    CompletionResponse,
    JoinCircleResponse,
    LeaderboardResponse,
    MembershipLookupResponse,
    RecommendedCircleResponse,
    RoadmapDetailResponse,
    MentorTermView,
    MentorWorkspaceResponse,
    PublishRoadmapRequest,
    PlannedRoadmapView,
    CircleLeaderboardResponse,
    CreateCircleRequest,
    LeaveCircleResponse,
    CircleMembersResponse,
)
from app.services.circles import (
    circle_home,
    current_membership,
    join_circle,
    membership_summary,
    recommended_circle,
    finalize_week,
    get_mentor_workspace,
    publish_next_roadmap,
    start_next_week,
)
from app.services.progress import (
    activity_feed,
    complete_checkpoint,
    full_leaderboard,
    roadmap_detail,
)

router = APIRouter(prefix="/api/v1", tags=["circles"])


@router.get("/circles/recommended", response_model=RecommendedCircleResponse)
async def read_recommended_circle(
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> RecommendedCircleResponse:
    return await recommended_circle(session, current_user)


@router.get("/me/circle-membership", response_model=MembershipLookupResponse)
async def read_current_membership(
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> MembershipLookupResponse:
    result = await current_membership(session, current_user.id)
    if result is None:
        return MembershipLookupResponse(membership=None)
    membership, circle = result
    return MembershipLookupResponse(
        membership=membership_summary(membership, circle)
    )


@router.post("/circles/{circle_id}/join", response_model=JoinCircleResponse)
async def join_recommended_circle(
    circle_id: UUID,
    response: Response,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> JoinCircleResponse:
    result, created = await join_circle(session, current_user, circle_id)
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return result


@router.get("/circles/{circle_id}/home", response_model=CircleHomeResponse)
async def read_circle_home(
    circle_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> CircleHomeResponse:
    return await circle_home(session, current_user, circle_id)


@router.get(
    "/circles/{circle_id}/roadmap", response_model=RoadmapDetailResponse
)
async def read_circle_roadmap(
    circle_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> RoadmapDetailResponse:
    return await roadmap_detail(session, current_user, circle_id)


@router.get(
    "/circles/{circle_id}/leaderboard", response_model=LeaderboardResponse
)
async def read_circle_leaderboard(
    circle_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> LeaderboardResponse:
    return await full_leaderboard(session, current_user, circle_id)


@router.get(
    "/circles/{circle_id}/activity-feed", response_model=ActivityFeedResponse
)
async def read_circle_activity_feed(
    circle_id: UUID,
    limit: int = Query(default=20, ge=1, le=50),
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> ActivityFeedResponse:
    return await activity_feed(session, current_user, circle_id, limit)


@router.post(
    "/circles/{circle_id}/checkpoints/{checkpoint_id}/complete",
    response_model=CompletionResponse,
)
async def complete_circle_checkpoint(
    circle_id: UUID,
    checkpoint_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> CompletionResponse:
    return await complete_checkpoint(
        session, current_user, circle_id, checkpoint_id
    )


@router.post(
    "/demo/circles/{circle_id}/finalize-week", response_model=MentorTermView
)
async def api_finalize_week(
    circle_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> MentorTermView:
    return await finalize_week(session, current_user, circle_id)


@router.get(
    "/circles/{circle_id}/mentor-workspace",
    response_model=MentorWorkspaceResponse,
)
async def api_get_mentor_workspace(
    circle_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> MentorWorkspaceResponse:
    return await get_mentor_workspace(session, current_user, circle_id)


@router.post(
    "/circles/{circle_id}/next-roadmap", response_model=PlannedRoadmapView
)
async def api_publish_next_roadmap(
    circle_id: UUID,
    request: PublishRoadmapRequest,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> PlannedRoadmapView:
    return await publish_next_roadmap(session, current_user, circle_id, request)


@router.post(
    "/demo/circles/{circle_id}/start-next-week",
    response_model=CircleHomeResponse,
)
async def api_start_next_week(
    circle_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> CircleHomeResponse:
    return await start_next_week(session, current_user, circle_id)


@router.get("/circles", response_model=CircleLeaderboardResponse)
async def read_circles(
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> CircleLeaderboardResponse:
    from app.schemas.circle import CircleLeaderboardResponse
    from app.services.circles import list_circles_service
    return await list_circles_service(session, current_user)


@router.post("/circles", response_model=JoinCircleResponse)
async def create_circle(
    request: CreateCircleRequest,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> JoinCircleResponse:
    from app.schemas.circle import CircleLeaderboardResponse, CreateCircleRequest
    from app.services.circles import create_circle_service
    return await create_circle_service(session, current_user, request.name, request.description)


@router.post("/circles/{circle_id}/leave", response_model=LeaveCircleResponse)
async def api_leave_circle(
    circle_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> LeaveCircleResponse:
    from app.schemas.circle import LeaveCircleResponse
    from app.services.circles import leave_circle
    return await leave_circle(session, current_user, circle_id)


@router.get("/circles/{circle_id}/members", response_model=CircleMembersResponse)
async def read_circle_members(
    circle_id: UUID,
    current_user: DemoUser = Depends(get_current_demo_user),
    session: AsyncSession = Depends(get_db),
) -> CircleMembersResponse:
    from app.schemas.circle import CircleMembersResponse
    from app.services.circles import get_circle_members
    return await get_circle_members(session, current_user, circle_id)



