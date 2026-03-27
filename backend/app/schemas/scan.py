from datetime import datetime

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Returned immediately after a file is accepted."""
    scan_id: str = Field(description="Unique identifier for this scan job")
    status: str = Field(default="queued", description="Current job status")
    message: str = Field(default="File accepted. Processing has been queued.")


class AnalysisOutput(BaseModel):
    """Structured output from the ML inference pipeline."""
    is_ai: bool = Field(description="Whether the file is likely AI-generated")
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="Model confidence (0.0 – 1.0)",
    )
    media_type: str = Field(description="Detected media type: image, audio, video")


class ScanResult(BaseModel):
    """Full scan result returned once processing completes."""
    id: str
    user_id: str
    file_hash: str
    result_score: float | None = Field(
        default=None, ge=0, le=100,
        description="AI-generation likelihood score (0-100)",
    )
    is_ai: bool | None = Field(default=None)
    media_type: str | None = Field(default=None)
    created_at: datetime
