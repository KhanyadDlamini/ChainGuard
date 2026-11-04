from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import engine

router = APIRouter(prefix="/api/v1/database", tags=["Database"])


@router.get("/status")
def database_status():
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("SELECT current_database(), current_user, version()")
            ).one()

        return {
            "status": "UP",
            "database": result[0],
            "connected_role": result[1],
            "server_version": result[2],
        }
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed: {type(exc).__name__}",
        ) from exc
