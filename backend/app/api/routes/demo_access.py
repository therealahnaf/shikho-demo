from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_demo_user
from app.db import get_db
from app.models import DemoUser
from app.schemas import DemoSessionVerify, DemoUserCreate, DemoUserCreated, DemoUserPublic
from app.services.demo_access import create_demo_user, verify_demo_access

router = APIRouter(prefix="/api/v1", tags=["demo access"])


@router.post(
    "/demo-users", response_model=DemoUserCreated, status_code=status.HTTP_201_CREATED
)
async def register_demo_user(
    payload: DemoUserCreate, session: AsyncSession = Depends(get_db)
) -> DemoUserCreated:
    user = await create_demo_user(session, payload)
    return DemoUserCreated(user=DemoUserPublic.model_validate(user), access_key=user.access_key)


@router.post("/demo-sessions/verify", response_model=DemoUserPublic)
async def verify_demo_session(
    payload: DemoSessionVerify, session: AsyncSession = Depends(get_db)
) -> DemoUser:
    return await verify_demo_access(session, payload)


@router.get("/me", response_model=DemoUserPublic)
async def read_current_user(
    current_user: DemoUser = Depends(get_current_demo_user),
) -> DemoUser:
    return current_user

