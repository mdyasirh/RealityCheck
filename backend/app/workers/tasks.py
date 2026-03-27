"""
Celery tasks – consumes scan jobs from the Redis queue.

Flow:
  1. Validate the temp file still exists.
  2. Compute a SHA-256 file hash.
  3. Route to the correct analyser based on file extension.
  4. Persist the result to the Supabase `scans` table.
  5. Securely delete the temp file (overwrite + unlink).
"""

import hashlib
import json
import logging
import os
from pathlib import Path

from app.workers.celery_app import celery
from app.db.supabase import get_supabase

logger = logging.getLogger(__name__)

# Extension → media type mapping
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
AUDIO_EXTENSIONS = {".wav"}
VIDEO_EXTENSIONS = {".mp4"}


# ── Helpers ──────────────────────────────────────────────────────


def _sha256(filepath: str) -> str:
    """Compute SHA-256 hash of a file in 64 KiB chunks."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65_536), b""):
            h.update(chunk)
    return h.hexdigest()


def _secure_delete(filepath: str) -> None:
    """Overwrite the file with zeros then unlink it for privacy."""
    path = Path(filepath)
    if not path.exists():
        return
    try:
        size = path.stat().st_size
        with open(filepath, "r+b") as f:
            f.write(b"\x00" * size)
            f.flush()
            os.fsync(f.fileno())
        path.unlink()
        logger.debug("Securely deleted %s", filepath)
    except Exception:
        # Fallback: just unlink
        path.unlink(missing_ok=True)
        logger.warning("Fell back to simple unlink for %s", filepath)


def _detect_media_type(filepath: str) -> str:
    """Return 'image', 'audio', or 'video' based on extension."""
    ext = Path(filepath).suffix.lower()
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    if ext in VIDEO_EXTENSIONS:
        return "video"
    raise ValueError(f"Unsupported file extension: {ext}")


def _run_inference(filepath: str, media_type: str) -> dict:
    """
    Dispatch to the appropriate ML pipeline.

    Returns:
        {"is_ai": bool, "confidence_score": float, "media_type": str}
    """
    if media_type == "image":
        from app.workers.analyze_image import analyze_image
        return analyze_image(filepath)

    if media_type == "audio":
        from app.workers.analyze_audio import analyze_audio
        return analyze_audio(filepath)

    if media_type == "video":
        # Video analysis: extract a key-frame and analyse it as an image.
        # Full temporal analysis can be added later.
        return _analyze_video_via_keyframe(filepath)

    raise ValueError(f"No analyser for media_type={media_type}")


def _analyze_video_via_keyframe(filepath: str) -> dict:
    """
    Extract the first key-frame from a video and run image analysis on it.

    This is a pragmatic first pass – a dedicated temporal model can
    replace this later for higher accuracy.
    """
    import tempfile

    try:
        import cv2
    except ImportError:
        logger.warning("opencv-python not installed; returning neutral score for video")
        return {"is_ai": False, "confidence_score": 0.5, "media_type": "video"}

    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video file: {filepath}")

    # Seek to 10 % of the duration for a representative frame
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    target_frame = max(1, total_frames // 10)
    cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)

    ret, frame = cap.read()
    cap.release()

    if not ret:
        raise RuntimeError(f"Failed to read frame {target_frame} from {filepath}")

    # Write the frame to a temporary PNG
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name
        cv2.imwrite(tmp_path, frame)

    try:
        from app.workers.analyze_image import analyze_image
        result = analyze_image(tmp_path)
        result["media_type"] = "video"
        return result
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ── Main Celery task ─────────────────────────────────────────────


@celery.task(name="process_scan", bind=True, max_retries=3)
def process_scan(self, scan_id: str, filepath: str, user_id: str) -> dict:
    """
    Background task that processes an uploaded media file.

    Consumed from the Redis queue by Celery workers.
    """
    try:
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Temp file missing: {filepath}")

        # 1. Hash the file
        file_hash = _sha256(filepath)

        # 2. Determine media type and run the appropriate model
        media_type = _detect_media_type(filepath)
        logger.info("Scan %s: %s file detected – running inference", scan_id, media_type)

        analysis = _run_inference(filepath, media_type)

        # 3. Convert confidence (0.0-1.0) → result_score (0-100)
        result_score = round(analysis["confidence_score"] * 100, 2)

        # 4. Persist to Supabase
        try:
            db = get_supabase()
            db.table("scans").update({
                "file_hash": file_hash,
                "result_score": result_score,
                "is_ai": analysis["is_ai"],
                "media_type": analysis["media_type"],
            }).eq("id", scan_id).execute()
        except Exception:
            logger.exception("Supabase update failed for scan %s", scan_id)

        logger.info(
            "Scan %s complete – %s | is_ai=%s | score=%.2f",
            scan_id, media_type, analysis["is_ai"], result_score,
        )

        # 5. Securely delete the temp file
        _secure_delete(filepath)

        return {
            "scan_id": scan_id,
            "file_hash": file_hash,
            "is_ai": analysis["is_ai"],
            "confidence_score": analysis["confidence_score"],
            "media_type": analysis["media_type"],
        }

    except Exception as exc:
        logger.exception("Scan %s failed", scan_id)
        # Clean up even on failure
        _secure_delete(filepath)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
