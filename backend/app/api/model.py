from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.dependencies import get_db
from app.models.models import (
    CaseEvidence,
    EvidenceRecord,
    Payment,
    ReconciliationCase,
)

router = APIRouter(prefix="/api/v1/model", tags=["Model"])


@router.get("/info")
def model_info():
    """Return the AI model configuration — provider, name, and whether a key is set."""
    return {
        "provider": "meta",
        "model_name": settings.model_name,
        "model_base_url": settings.model_base_url,
        "api_key_configured": settings.model_api_key is not None,
    }


# ---------------------------------------------------------------------------
# Evidence list endpoint (lives here to keep the evidence concept grouped)
# ---------------------------------------------------------------------------

router_evidence = APIRouter(prefix="/api/v1/evidence", tags=["Evidence"])


@router_evidence.get("")
def list_evidence(
    db: Session = Depends(get_db),
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    transaction_hash: Annotated[str | None, Query()] = None,
):
    """List evidence records with optional tx hash filter, paginated."""
    q = select(EvidenceRecord)
    if transaction_hash:
        q = q.where(EvidenceRecord.transaction_hash == transaction_hash)
    q = q.order_by(EvidenceRecord.recorded_at.desc())

    total: int = db.scalar(
        select(func.count()).select_from(
            select(EvidenceRecord)
            .where(
                EvidenceRecord.transaction_hash == transaction_hash
                if transaction_hash
                else True
            )
            .subquery()
        )
    ) or 0

    rows = db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all()

    # Also pull the external_reference from the linked payment via the case
    case_map: dict[str, str] = {}
    case_ids = list({str(r.case_id) for r in rows})
    if case_ids:
        cases = db.scalars(
            select(ReconciliationCase).where(
                ReconciliationCase.id.in_(case_ids)  # type: ignore[arg-type]
            )
        ).all()
        payment_ids = list({str(c.payment_id) for c in cases})
        payments = db.scalars(
            select(Payment).where(Payment.id.in_(payment_ids))  # type: ignore[arg-type]
        ).all()
        pid_to_ref = {str(p.id): p.external_reference for p in payments}
        cid_to_pid = {str(c.id): str(c.payment_id) for c in cases}
        case_map = {
            cid: pid_to_ref.get(cid_to_pid[cid], "—") for cid in cid_to_pid
        }

    items = [
        {
            "evidence_id": str(r.id),
            "case_id": str(r.case_id),
            "payment_reference": case_map.get(str(r.case_id), "—"),
            "transaction_hash": r.transaction_hash,
            "chain_id": r.chain_id,
            "block_number": r.block_number,
            "receipt_status": r.receipt_status,
            "token_address": r.token_address,
            "sender_address": r.sender_address,
            "recipient_address": r.recipient_address,
            "amount_raw": str(r.amount_raw),
            "log_index": r.log_index,
            "source": r.source,
            "recorded_at": r.recorded_at.isoformat(),
        }
        for r in rows
    ]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }
