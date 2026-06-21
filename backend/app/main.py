from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.handlers import install_error_handlers
from app.api.routes.demo_access import router as demo_access_router
from app.api.routes.circles import router as circles_router
from app.api.routes.health import router as health_router
from app.api.routes.notes import router as notes_router
from app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="StudyCircle API",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Idempotency-Key", "X-Demo-Username", "X-Demo-Access-Key"],
    )
    install_error_handlers(application)
    application.include_router(health_router)
    application.include_router(demo_access_router)
    application.include_router(circles_router)
    application.include_router(notes_router)
    return application


app = create_app()
