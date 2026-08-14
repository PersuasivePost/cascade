from fastapi import APIRouter

from app.db import verify_connectivity

router = APIRouter()


@router.get("/health")
def health():
    ok, error = verify_connectivity()
    return {"database_connected": ok, "error": error}
