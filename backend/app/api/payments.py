from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.models import Payment, ReconciliationCase
from app.schemas.payments import PaymentCreate, PaymentResponse

router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])


@router.get("")
def list_payments(
    db: Session = Depends(get_db),
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: Annotated[str | None, Query()] = None,
):
    """List payments with optional status filter, paginated."""
    q = select(Payment)
    if status:
        q = q.where(Payment.status == status)
    q = q.order_by(Payment.created_at.desc())

    total: int = db.scalar(
        select(func.count()).select_from(q.subquery())
    ) or 0

    rows = db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [PaymentResponse.model_validate(r) for r in rows],
    }


@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)):
    payment = Payment(**payload.model_dump())
    db.add(payment)

    try:
        db.commit()
        db.refresh(payment)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A payment with this external reference already exists",
        ) from exc

    return payment


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    from uuid import UUID

    try:
        parsed_id = UUID(payment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payment ID") from exc

    payment = db.get(Payment, parsed_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    return payment
