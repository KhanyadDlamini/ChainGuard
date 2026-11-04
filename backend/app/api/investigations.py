from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from web3 import Web3

from app.core.config import settings
from app.db.dependencies import get_db
from app.models.models import (
    AIInvestigation,
    AuditEvent,
    CaseEvidence,
    EvidenceRecord,
    InvestigationReport,
    Payment,
    ReconciliationCase,
)

router = APIRouter(prefix="/api/v1/investigations", tags=["Investigations"])


@router.get("/cases")
def list_cases(
    db: Session = Depends(get_db),
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    result: Annotated[str | None, Query()] = None,
):
    """List reconciliation cases with payment info, paginated."""
    q = (
        select(ReconciliationCase, Payment)
        .join(Payment, Payment.id == ReconciliationCase.payment_id)
    )
    if result:
        q = q.where(ReconciliationCase.result == result)
    q = q.order_by(ReconciliationCase.created_at.desc())

    total: int = db.scalar(
        select(func.count()).select_from(
            select(ReconciliationCase)
            .where(ReconciliationCase.result == result if result else True)
            .subquery()
        )
    ) or 0

    rows = db.execute(q.offset((page - 1) * page_size).limit(page_size)).all()

    items = [
        {
            "case_id": str(case.id),
            "payment_id": str(case.payment_id),
            "external_reference": payment.external_reference,
            "asset_symbol": payment.asset_symbol,
            "status": case.status,
            "result": case.result,
            "expected_amount": str(case.expected_amount),
            "observed_amount": str(case.observed_amount) if case.observed_amount is not None else None,
            "difference": str(case.difference) if case.difference is not None else None,
            "summary": case.summary,
            "created_at": case.created_at.isoformat(),
            "resolved_at": case.resolved_at.isoformat() if case.resolved_at else None,
        }
        for case, payment in rows
    ]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


@router.get("/summary")
def investigations_summary(db: Session = Depends(get_db)):
    """Aggregate counts for the dashboard stats cards."""
    total_payments: int = db.scalar(select(func.count()).select_from(Payment)) or 0
    total_cases: int = db.scalar(select(func.count()).select_from(ReconciliationCase)) or 0

    result_counts = dict(
        db.execute(
            select(ReconciliationCase.result, func.count())
            .group_by(ReconciliationCase.result)
        ).all()
    )

    total_evidence: int = db.scalar(
        select(func.count()).select_from(EvidenceRecord)
    ) or 0

    total_ai_investigations: int = db.scalar(
        select(func.count()).select_from(AIInvestigation)
    ) or 0

    total_reports: int = db.scalar(
        select(func.count()).select_from(InvestigationReport)
    ) or 0

    return {
        "payments": {
            "total": total_payments,
        },
        "cases": {
            "total": total_cases,
            "by_result": result_counts,
            "discrepancies": result_counts.get("DISCREPANCY", 0),
            "matched": result_counts.get("MATCHED", 0),
            "failed": result_counts.get("FAILED", 0),
            "pending": result_counts.get("PENDING", 0),
            "unverified": result_counts.get("UNVERIFIED", 0),
        },
        "evidence": {
            "total": total_evidence,
        },
        "investigations": {
            "total": total_reports,
            "ai_total": total_ai_investigations,
        },
    }


def decimal_text(value):
    return str(value) if value is not None else None


@router.post("/cases/{case_id}", status_code=201)
def investigate_case(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(ReconciliationCase, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Reconciliation case not found")

    payment = db.get(Payment, case.payment_id)
    if payment is None:
        raise HTTPException(status_code=409, detail="Case has no associated payment")

    evidence = db.scalars(
        select(EvidenceRecord)
        .join(
            CaseEvidence,
            CaseEvidence.evidence_id == EvidenceRecord.id,
        )
        .where(CaseEvidence.case_id == case.id)
        .order_by(EvidenceRecord.block_number, EvidenceRecord.log_index)
    ).all()

    audit_events = db.scalars(
        select(AuditEvent)
        .where(
            AuditEvent.entity_type == "reconciliation_case",
            AuditEvent.entity_id == str(case.id),
        )
        .order_by(AuditEvent.created_at)
    ).all()

    expected = Decimal(case.expected_amount)
    observed = Decimal(case.observed_amount) if case.observed_amount is not None else None
    difference = (
        observed - expected if observed is not None else None
    )

    facts = [
        {
            "fact": "reconciliation_result",
            "value": case.result,
            "source": "postgresql.reconciliation_cases",
        },
        {
            "fact": "payment_status",
            "value": payment.status,
            "source": "postgresql.payments",
        },
        {
            "fact": "expected_amount",
            "value": decimal_text(expected),
            "asset": payment.asset_symbol,
            "source": "postgresql.reconciliation_cases",
        },
        {
            "fact": "observed_amount",
            "value": decimal_text(observed),
            "asset": payment.asset_symbol,
            "source": "postgresql.reconciliation_cases",
        },
    ]

    if difference is not None:
        facts.append({
            "fact": "observed_minus_expected",
            "value": decimal_text(difference),
            "asset": payment.asset_symbol,
            "source": "deterministic_calculation",
        })

    findings = []
    if case.result == "MATCHED" and observed == expected:
        findings.append({
            "code": "AMOUNT_MATCH",
            "severity": "info",
            "message": "The recorded observed amount equals the expected amount.",
            "evidence_basis": ["reconciliation_result", "expected_amount", "observed_amount"],
        })
    elif observed is not None and observed != expected:
        findings.append({
            "code": "AMOUNT_DISCREPANCY",
            "severity": "high",
            "message": (
                f"The observed amount is short by {decimal_text(expected - observed)} "
                f"{payment.asset_symbol}."
                if observed < expected
                else f"The observed amount exceeds the expected amount by "
                     f"{decimal_text(observed - expected)} {payment.asset_symbol}."
            ),
            "evidence_basis": ["expected_amount", "observed_amount"],
        })
    else:
        findings.append({
            "code": "INSUFFICIENT_RECONCILIATION_DATA",
            "severity": "medium",
            "message": "The stored reconciliation result cannot establish an amount match or discrepancy.",
            "evidence_basis": ["reconciliation_result"],
        })

    evidence_items = [
        {
            "evidence_id": str(item.id),
            "transaction_hash": item.transaction_hash,
            "chain_id": item.chain_id,
            "block_number": item.block_number,
            "receipt_status": item.receipt_status,
            "token_address": item.token_address,
            "sender_address": item.sender_address,
            "recipient_address": item.recipient_address,
            "amount_raw": str(item.amount_raw),
            "log_index": item.log_index,
            "source": item.source,
            "raw_evidence": item.raw_evidence,
        }
        for item in evidence
    ]

    if not evidence:
        findings.append({
            "code": "NO_PERSISTED_CHAIN_EVIDENCE",
            "severity": "high",
            "message": "No persisted blockchain evidence records were found for this case.",
            "evidence_basis": [],
        })

    report = {
        "schema_version": "1.0",
        "investigation_mode": "DETERMINISTIC",
        "generated_at": datetime.now(UTC).isoformat(),
        "case": {
            "case_id": str(case.id),
            "status": case.status,
            "result": case.result,
            "summary": case.summary,
        },
        "payment": {
            "payment_id": str(payment.id),
            "external_reference": payment.external_reference,
            "status": payment.status,
            "asset_symbol": payment.asset_symbol,
            "chain_id": payment.chain_id,
            "expected_tx_hash": payment.expected_tx_hash,
        },
        "verified_facts": facts,
        "findings": findings,
        "evidence": evidence_items,
        "audit_event_ids": [str(event.id) for event in audit_events],
        "unknowns": [
            "The underlying cause of any discrepancy has not been established by this report.",
            "No inference is made about intent, fraud, or responsibility.",
            "This report uses persisted reconciliation and evidence records; it does not independently re-query the blockchain.",
        ],
        "limitations": [
            "This is a deterministic report, not an AI-generated investigation.",
            "Conclusions are limited to the stored records referenced in this report.",
        ],
    }

    record = InvestigationReport(
        case_id=case.id,
        report_type="DETERMINISTIC",
        report=report,
    )
    db.add(record)
    db.flush()

    report["investigation_id"] = str(record.id)
    record.report = report
    flag_modified(record, "report")
    db.commit()

    return {
        "investigation_id": str(record.id),
        "case_id": str(case.id),
        "report_type": record.report_type,
        "report": report,
    }


from app.services.ai_investigation import (
    AIInvestigationError,
    analyze_investigation,
)


@router.post("/cases/{case_id}/ai", status_code=201)
async def analyze_case_with_ai(
    case_id: UUID,
    db: Session = Depends(get_db),
):
    case = db.get(ReconciliationCase, case_id)

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Reconciliation case not found",
        )

    deterministic_report = db.scalar(
        select(InvestigationReport)
        .where(
            InvestigationReport.case_id == case_id,
            InvestigationReport.report_type == "DETERMINISTIC",
        )
        .order_by(InvestigationReport.created_at.desc())
        .limit(1)
    )

    if deterministic_report is None:
        raise HTTPException(
            status_code=409,
            detail="Generate a deterministic investigation report first.",
        )

    try:
        assessment = await analyze_investigation(
            deterministic_report.report
        )
    except AIInvestigationError as exc:
        status_code = (
            503
            if "MODEL_API_KEY is not configured" in str(exc)
            else 502
        )
        raise HTTPException(
            status_code=status_code,
            detail=str(exc),
        ) from exc

    record = AIInvestigation(
        investigation_report_id=deterministic_report.id,
        provider="meta",
        model_name=settings.model_name,
        prompt_version="1.1",
        assessment=assessment.model_dump(mode="json"),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "ai_investigation_id": str(record.id),
        "case_id": str(case_id),
        "deterministic_investigation_id": str(deterministic_report.id),
        "provider": record.provider,
        "model": record.model_name,
        "prompt_version": record.prompt_version,
        "created_at": record.created_at.isoformat(),
        "assessment": record.assessment,
    }

@router.post("/cases/{case_id}/refresh-evidence")
def refresh_case_evidence(case_id: UUID, db: Session = Depends(get_db)):
    case = db.get(ReconciliationCase, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Reconciliation case not found")

    payment = db.get(Payment, case.payment_id)
    if payment is None or not payment.expected_tx_hash:
        raise HTTPException(
            status_code=409,
            detail="No expected transaction hash is available for this case.",
        )

    rpc_url = settings.chainguard_rpc_url
    expected_chain_id = settings.chainguard_chain_id

    w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 5}))

    if not w3.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain RPC is unavailable.")

    actual_chain_id = w3.eth.chain_id
    if actual_chain_id != expected_chain_id or actual_chain_id != payment.chain_id:
        raise HTTPException(
            status_code=409,
            detail="Connected blockchain network does not match the payment network.",
        )

    tx_hash = payment.expected_tx_hash

    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve the transaction receipt.",
        ) from exc

    receipt_tx_hash = Web3.to_hex(receipt["transactionHash"])
    if receipt_tx_hash.lower() != tx_hash.lower():
        raise HTTPException(
            status_code=409,
            detail="Retrieved receipt does not match the expected transaction.",
        )

    receipt_logs = []
    for log in receipt["logs"]:
        receipt_logs.append(
            {
                "address": Web3.to_checksum_address(log["address"]),
                "topics": [Web3.to_hex(topic) for topic in log["topics"]],
                "data": Web3.to_hex(log["data"]),
                "log_index": int(log["logIndex"]),
                "transaction_index": int(log["transactionIndex"]),
                "block_number": int(log["blockNumber"]),
                "block_hash": Web3.to_hex(log["blockHash"]),
                "removed": bool(log["removed"]),
            }
        )

    evidence_records = db.scalars(
        select(EvidenceRecord)
        .join(CaseEvidence, CaseEvidence.evidence_id == EvidenceRecord.id)
        .where(
            CaseEvidence.case_id == case_id,
            EvidenceRecord.transaction_hash == tx_hash,
        )
    ).all()

    if not evidence_records:
        raise HTTPException(
            status_code=404,
            detail="No linked evidence records exist for this transaction.",
        )

    for item in evidence_records:
        raw_evidence = dict(item.raw_evidence or {})
        raw_evidence["receipt_logs"] = receipt_logs
        raw_evidence["receipt_log_count"] = len(receipt_logs)
        raw_evidence["receipt_logs_source"] = "rpc_transaction_receipt"
        item.raw_evidence = raw_evidence
        flag_modified(item, "raw_evidence")

    db.commit()

    return {
        "case_id": str(case_id),
        "transaction_hash": tx_hash,
        "chain_id": actual_chain_id,
        "receipt_log_count": len(receipt_logs),
        "updated_evidence_records": len(evidence_records),
        "payment_status_changed": False,
        "case_status_changed": False,
    }
