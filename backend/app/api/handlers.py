from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.errors import AppError


def error_body(code: str, message: str, fields: dict | None = None) -> dict:
    return {"code": code, "message": message, "fields": fields or {}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(exc.code, exc.message, exc.fields),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        fields: dict[str, str] = {}
        for error in exc.errors():
            location = [str(part) for part in error["loc"] if part not in {"body", "query"}]
            key = ".".join(location) or "request"
            fields.setdefault(key, error["msg"])
        return JSONResponse(
            status_code=422,
            content=error_body(
                "validation_error", "Please correct the highlighted fields.", fields
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=error_body(
                "internal_error", "Something went wrong. Please try again."
            ),
        )

