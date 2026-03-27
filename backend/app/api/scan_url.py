import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.db.supabase import get_supabase
from app.schemas.scan import UploadResponse
from app.workers.tasks import process_scan

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".mp4", ".wav"}
MAX_DOWNLOAD_SIZE = settings.max_file_size_mb * 1024 * 1024


class ScanUrlRequest(BaseModel):
    url: str = Field(description="Public URL of the media file to analyse")


@router.post(
    "/scan-url",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a public media URL for deepfake analysis",
)
async def scan_url(body: ScanUrlRequest) -> UploadResponse:
    parsed = urlparse(body.url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only http/https URLs are supported.",
        )

    # Infer extension from the URL path
    url_path = Path(parsed.path)
    ext = url_path.suffix.lower().split("?")[0]
    if ext not in ALLOWED_EXTENSIONS:
        # Fallback: try downloading and sniffing content-type
        ext = ".jpg"

    # Download the file
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            resp = await client.get(body.url)
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch URL (HTTP {exc.response.status_code}).",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not reach the provided URL.",
        )

    contents = resp.content
    if len(contents) > MAX_DOWNLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_file_size_mb} MB limit.",
        )

    # Detect extension from content-type if needed
    ct = resp.headers.get("content-type", "")
    ct_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "video/mp4": ".mp4",
        "audio/wav": ".wav",
    }
    for mime, e in ct_map.items():
        if mime in ct:
            ext = e
            break

    # Save to temp
    scan_id = str(uuid.uuid4())
    temp_dir = Path(settings.upload_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{scan_id}{ext}"
    temp_path.write_bytes(contents)

    # Insert placeholder into Supabase
    demo_user_id = "00000000-0000-0000-0000-000000000000"
    try:
        db = get_supabase()
        db.table("scans").insert({
            "id": scan_id,
            "user_id": demo_user_id,
            "file_hash": "",
        }).execute()
    except Exception:
        pass

    # Enqueue background job
    process_scan.delay(scan_id, str(temp_path), demo_user_id)

    return UploadResponse(scan_id=scan_id)
