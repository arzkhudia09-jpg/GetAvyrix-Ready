import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routes.scan import router as scan_router
from .routes.explain import router as explain_router
from .security.headers import add_security_headers

logging.basicConfig(level=logging.INFO)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
API_BASE_URL = os.getenv("API_BASE_URL", "").strip()
DEFAULT_CORS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://*.vercel.app",
    "https://*.github.io",
]

app = FastAPI(title="DevSecureCoach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", ",".join(DEFAULT_CORS)).split(","),
    allow_origin_regex=r"https://.*\.(vercel\.app|github\.io)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(add_security_headers)

app.include_router(scan_router, prefix="", tags=["scan"])
app.include_router(explain_router, prefix="", tags=["explain"])


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "devsecurecoach",
        "environment": ENVIRONMENT,
        "api_base_url": API_BASE_URL or None,
    }


@app.exception_handler(404)
async def not_found_handler(_, exc):
    return JSONResponse(status_code=404, content={"status": "error", "message": "Not found"})


@app.exception_handler(500)
async def server_error_handler(_, exc):
    return JSONResponse(status_code=500, content={"status": "error", "message": "The server could not complete the request."})
