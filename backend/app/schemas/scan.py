from datetime import datetime

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Returned immediately after a file is accepted."""
    scan_id: str = Field(description="Unique identifier for this scan job")
    status: str = Field(default="queued", description="Current job status")
    message: str = Field(default="File accepted. Processing has been queued.")


class ScanResult(BaseModel):
    """Full scan result returned once processing completes."""
    id: str
    user_id: str
    file_hash: str
    result_score: float | None = Field(
        default=None, ge=0, le=100,
        description="AI-generation likelihood score (0-100)",
    )
    created_at: datetime
