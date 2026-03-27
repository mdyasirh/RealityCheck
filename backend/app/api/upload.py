import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.core.config import settings
from app.db.supabase import get_supabase
from app.schemas.scan import UploadResponse
from app.workers.tasks import process_scan

router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "video/mp4",
    "audio/wav",
}

MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024  # bytes


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a media file for deepfake analysis",
)
async def upload_file(file: UploadFile) -> UploadResponse:
    # --- validate content type ---
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
            ),
        )

    # --- read & validate size ---
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_file_size_mb} MB limit.",
        )

    # --- generate unique scan ID and save to temp ---
    scan_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix if file.filename else ""
    temp_dir = Path(settings.upload_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{scan_id}{ext}"

    temp_path.write_bytes(contents)

    # --- create a placeholder row in Supabase ---
    # Using a hard-coded demo user ID until auth is wired up.
    demo_user_id = "00000000-0000-0000-0000-000000000000"

    try:
        db = get_supabase()
        db.table("scans").insert({
            "id": scan_id,
            "user_id": demo_user_id,
            "file_hash": "",
        }).execute()
    except Exception:
        # If Supabase isn't configured yet, continue without persisting
        pass

    # --- enqueue background job ---
    process_scan.delay(scan_id, str(temp_path), demo_user_id)

    return UploadResponse(scan_id=scan_id)
