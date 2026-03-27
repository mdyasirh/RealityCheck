from fastapi import APIRouter, HTTPException, status

from app.db.supabase import get_supabase
from app.schemas.scan import ScanResult

router = APIRouter()


@router.get(
    "/scans/{scan_id}",
    response_model=ScanResult,
    summary="Get the result of a scan by ID",
)
async def get_scan(scan_id: str) -> ScanResult:
    db = get_supabase()
    response = (
        db.table("scans")
        .select("*")
        .eq("id", scan_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan '{scan_id}' not found.",
        )

    return ScanResult(**response.data)
