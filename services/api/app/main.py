from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .features.auth.router import router as auth_router
from .features.diary.router import router as diary_router
from .features.foods.router import router as foods_router
from .features.photos.router import router as photos_router
from .features.favourites.router import router as favourites_router
from .features.targets.router import router as targets_router
from .features.account.router import router as account_router
from .core.exception_handlers import register_exception_handlers


from .core.middleware import BodyLimit


@asynccontextmanager
async def lifespan(app):
    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        app.state.http = client
        yield


def create_app(http_client=None):
    @asynccontextmanager
    async def app_lifespan(app):
        if http_client is not None:
            app.state.http = http_client
            yield
        else:
            async with lifespan(app):
                yield
    app = FastAPI(title="MayRoar API", lifespan=app_lifespan)
    app.add_middleware(BodyLimit)
    app.add_middleware(CORSMiddleware, allow_origins=settings().allowed_origins,
                       allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
                       allow_headers=["Authorization", "Content-Type"])

    register_exception_handlers(app)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    for router in (auth_router, foods_router, diary_router, photos_router, favourites_router, targets_router, account_router):
        app.include_router(router)
    return app


app = create_app()
