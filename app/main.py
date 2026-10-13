from fastapi import FastAPI
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from starlette.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.db.init_db import init_defaults
from app.db.session import SessionLocal, engine
from app.models.base import Base


@asynccontextmanager
async def lifespan_app(app: FastAPI) -> AsyncGenerator[None, None]:
    """Async lifespan handler for FastAPI application.

    Startup: create database tables and seed defaults
    Shutdown: cleanup (add as needed)
    """
    # Startup
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        init_defaults(db)
    yield
    # Shutdown - can add cleanup here


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan_app)

    # Security headers middleware
    @app.middleware("http")
    async def security_headers_middleware(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allow_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )

    app.include_router(router, prefix=settings.api_prefix)
    return app


app = create_app()
