from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .routers import auth, diary, foods, photos


class BodyLimit:
    """Bound actual streamed bytes, including requests without Content-Length."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        limit = 7 * 1024 * 1024 if scope["path"] == "/analyse-food" else 128 * 1024
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            size += len(chunk)
            if size > limit:
                return await JSONResponse({"error": "Request is too large."}, status_code=413)(scope, receive, send)
            chunks.append(chunk)
            if not message.get("more_body", False):
                break
        consumed = False
        async def bounded_receive():
            nonlocal consumed
            if consumed:
                return await receive()
            consumed = True
            return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
        await self.app(scope, bounded_receive, send)


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

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return JSONResponse({"error": exc.detail}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Do not echo credentials or full image data from validation input.
        return JSONResponse({"error": "Invalid request. Check dates, food values and required fields."}, status_code=422)

    @app.exception_handler(httpx.TimeoutException)
    async def timeout(request: Request, exc):
        return JSONResponse({"error": "The upstream service timed out. Try again."}, status_code=504)

    @app.exception_handler(httpx.RequestError)
    async def connection_error(request: Request, exc):
        return JSONResponse({"error": "Could not reach the upstream service."}, status_code=502)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    for router in (auth.router, foods.router, diary.router, photos.router):
        app.include_router(router)
    return app


app = create_app()
