from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_demo_user
from app.db import get_db
from app.models import DemoUser
from app.schemas.circle import (
    CircleHomeResponse,
    JoinCircleResponse,
    MembershipLookupResponse,
    RecommendedCircleResponse,
)
from app.services.circles import (
    circle_home,
    current_membership,
    join_circle,
    membership_summary,
    recommended_circle,
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

