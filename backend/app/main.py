from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import upload, scans, scan_url
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure the temp upload directory exists on startup."""
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="RealityCheck API",
    description="AI Deepfake Detection backend",
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS: allow the Next.js frontend + Chrome extension ---
allowed_origins = [settings.frontend_url]
if settings.chrome_extension_id:
    allowed_origins.append(f"chrome-extension://{settings.chrome_extension_id}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# --- Routes ---
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(scans.router, prefix="/api", tags=["Scans"])
app.include_router(scan_url.router, prefix="/api", tags=["Scan URL"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}
