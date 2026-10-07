import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from .errors import ServiceError


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(ServiceError)
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

