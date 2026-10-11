from fastapi import FastAPI

from app.api.routes import router
from app.core.config import get_settings
from app.db.init_db import init_defaults
from app.db.session import SessionLocal, engine
from app.models.base import Base


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            init_defaults(db)

    app.include_router(router, prefix=settings.api_prefix)
    return app


app = create_app()
