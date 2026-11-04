from decimal import Decimal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.api.blockchain import router as blockchain_router
from app.api.database import router as database_router
from app.api.investigations import router as investigations_router
from app.api.model import router as model_router
from app.api.model import router_evidence as evidence_router
from app.api.payments import router as payments_router
from app.api.reconciliation import router as reconciliation_router

app = FastAPI(
    title="ChainGuard API",
    description="Evidence-driven blockchain reconciliation and investigation",
    version="0.1.0",
)

# Browser calls go direct to the API (no proxy), so allow the local UI
# origins. Localhost-only demo service: no credentials, no wildcards.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3001",
        "http://localhost:3001",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PaymentComparison(BaseModel):
    payment_id: str
    expected_amount: Decimal = Field(gt=0)
    observed_amount: Decimal = Field(ge=0)
    asset: str = "DSZL"


@app.get("/health")
def health():
    return {"status": "ok", "service": "chainguard-api"}


@app.post("/api/v1/reconciliation/compare")
def compare_payment(payment: PaymentComparison):
    matched = payment.expected_amount == payment.observed_amount

    difference = payment.expected_amount - payment.observed_amount

    return {
        "payment_id": payment.payment_id,
        "asset": payment.asset,
        "expected_amount": str(payment.expected_amount),
        "observed_amount": str(payment.observed_amount),
        "difference": str(difference),
        "status": "MATCHED" if matched else "DISCREPANCY",
        "investigation_required": not matched,
        "evidence_source": "supplied_observation",
    }


app.include_router(blockchain_router)
app.include_router(database_router)
app.include_router(model_router)
app.include_router(evidence_router)
app.include_router(payments_router)
app.include_router(reconciliation_router)
app.include_router(investigations_router)
