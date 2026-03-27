import hashlib
import logging
from pathlib import Path

from app.workers.celery_app import celery
from app.db.supabase import get_supabase

logger = logging.getLogger(__name__)


def _sha256(filepath: str) -> str:
    """Compute SHA-256 hash of a file in 64 KiB chunks."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65_536), b""):
            h.update(chunk)
    return h.hexdigest()


@celery.task(name="process_scan", bind=True, max_retries=3)
def process_scan(self, scan_id: str, filepath: str, user_id: str) -> dict:
    """
    Background task that processes an uploaded media file.

    Steps:
      1. Hash the file.
      2. (Placeholder) Run the deepfake-detection model.
      3. Persist the result to Supabase.
      4. Clean up the temp file.
    """
    try:
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Temp file missing: {filepath}")

        # 1. Hash
        file_hash = _sha256(filepath)

        # 2. Placeholder score – replace with real model inference later
        mock_score = 42.0

        # 3. Persist to Supabase
        db = get_supabase()
        db.table("scans").update({
            "file_hash": file_hash,
            "result_score": mock_score,
        }).eq("id", scan_id).execute()

        logger.info("Scan %s complete – score %.1f", scan_id, mock_score)

        # 4. Cleanup
        path.unlink(missing_ok=True)

        return {"scan_id": scan_id, "score": mock_score, "file_hash": file_hash}

    except Exception as exc:
        logger.exception("Scan %s failed", scan_id)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
