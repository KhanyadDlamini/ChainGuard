import logging
import os
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from web3 import Web3
from web3.exceptions import TransactionNotFound
from web3.logs import DISCARD

from app.db.dependencies import get_db
from app.models.models import (
    AuditEvent,
    CaseEvidence,
    EvidenceRecord,
    Payment,
    ReconciliationCase,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payments", tags=["Reconciliation"])

TRANSFER_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"},
        ],
        "name": "Transfer",
        "type": "event",
    }
]

TERMINAL_RESULTS = {"MATCHED", "DISCREPANCY", "FAILED"}


def case_response(db, payment, case, replayed=False):
    evidence_count = (
        db.scalar(
            select(func.count())
            .select_from(CaseEvidence)
            .where(CaseEvidence.case_id == case.id)
        )
        or 0
    )

    audit_event = db.scalar(
        select(AuditEvent)
        .where(
            AuditEvent.entity_type == "reconciliation_case",
            AuditEvent.entity_id == str(case.id),
            AuditEvent.event_type == "RECONCILIATION_" + case.result,
        )
        .order_by(AuditEvent.created_at.desc())
        .limit(1)
    )
    audit_details = audit_event.details if audit_event else {}
    receipt_status = audit_details.get("receipt_status")

    if receipt_status is None:
        receipt_status = db.scalar(
            select(EvidenceRecord.receipt_status)
            .join(
                CaseEvidence,
                CaseEvidence.evidence_id == EvidenceRecord.id,
            )
            .where(CaseEvidence.case_id == case.id)
            .order_by(EvidenceRecord.log_index)
            .limit(1)
        )

    return {
        "case_id": str(case.id),
        "payment_id": str(payment.id),
        "external_reference": payment.external_reference,
        "result": case.result,
        "payment_status": payment.status,
        "expected_amount": str(case.expected_amount),
        "observed_amount": (
            str(case.observed_amount) if case.observed_amount is not None else None
        ),
        "difference": (str(case.difference) if case.difference is not None else None),
        "transaction_hash": payment.expected_tx_hash,
        "chain_id": payment.chain_id,
        "receipt_status": receipt_status,
        "transfer_event_count": audit_details.get(
            "transfer_event_count", evidence_count
        ),
        "evidence_count": evidence_count,
        "summary": case.summary,
        "replayed": replayed,
    }


@router.post("/{payment_id}/reconcile")
def reconcile_payment(payment_id: UUID, db: Session = Depends(get_db)):
    try:
        payment = db.scalar(
            select(Payment).where(Payment.id == payment_id).with_for_update()
        )

        if payment is None:
            raise HTTPException(status_code=404, detail="Payment not found")

        case = db.scalar(
            select(ReconciliationCase)
            .where(ReconciliationCase.payment_id == payment.id)
            .with_for_update()
        )

        if case is not None and case.result in TERMINAL_RESULTS:
            response = case_response(db, payment, case, replayed=True)
            db.commit()
            return response

        tx_hash = payment.expected_tx_hash
        if not tx_hash:
            raise HTTPException(
                status_code=422,
                detail="Payment has no expected transaction hash",
            )

        rpc_url = os.getenv("CHAINGUARD_RPC_URL", "http://127.0.0.1:8545")
        expected_chain_id = int(os.getenv("CHAINGUARD_CHAIN_ID", "1337"))
        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 10}))

        if not w3.is_connected():
            raise HTTPException(status_code=503, detail="Blockchain RPC unavailable")

        actual_chain_id = w3.eth.chain_id
        if actual_chain_id != expected_chain_id or payment.chain_id != actual_chain_id:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Blockchain chain ID does not match payment configuration",
                    "configured_chain_id": expected_chain_id,
                    "payment_chain_id": payment.chain_id,
                    "actual_chain_id": actual_chain_id,
                },
            )

        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            tx = w3.eth.get_transaction(tx_hash)
        except TransactionNotFound:
            summary = "Transaction or receipt not found on the configured chain."

            if case is None:
                case = ReconciliationCase(
                    payment_id=payment.id,
                    status="OPEN",
                    result="UNVERIFIED",
                    expected_amount=payment.expected_amount,
                    summary=summary,
                )
                db.add(case)
                db.flush()
                db.add(
                    AuditEvent(
                        entity_type="reconciliation_case",
                        entity_id=str(case.id),
                        event_type="RECONCILIATION_UNVERIFIED",
                        actor="system",
                        details={
                            "payment_id": str(payment.id),
                            "transaction_hash": tx_hash,
                            "chain_id": actual_chain_id,
                        },
                    )
                )
            else:
                case.status = "OPEN"
                case.result = "UNVERIFIED"
                case.expected_amount = payment.expected_amount
                case.observed_amount = None
                case.difference = None
                case.summary = summary
                case.resolved_at = None

            payment.status = "RECONCILIATION_REQUIRED"
            db.commit()
            return case_response(db, payment, case)

        token_address = Web3.to_checksum_address(payment.token_address)

        transaction_evidence = {
            "hash": tx_hash,
            "sender": Web3.to_checksum_address(tx["from"]),
            "destination": (
                Web3.to_checksum_address(tx["to"]) if tx.get("to") else None
            ),
            "value_wei": str(tx["value"]),
            "nonce": int(tx["nonce"]),
            "block_number": (
                int(tx["blockNumber"]) if tx.get("blockNumber") is not None else None
            ),
            "block_hash": (
                Web3.to_hex(tx["blockHash"]) if tx.get("blockHash") else None
            ),
            "gas_limit": int(tx["gas"]),
            "gas_price_wei": (
                str(tx["gasPrice"]) if tx.get("gasPrice") is not None else None
            ),
        }
        receipt_evidence = {
            "status": int(receipt["status"]),
            "block_number": int(receipt["blockNumber"]),
            "block_hash": (
                Web3.to_hex(receipt["blockHash"])
                if receipt.get("blockHash") else None
            ),
            "transaction_index": int(receipt["transactionIndex"]),
            "gas_used": int(receipt["gasUsed"]),
            "effective_gas_price_wei": (
                str(receipt["effectiveGasPrice"])
                if receipt.get("effectiveGasPrice") is not None else None
            ),
        }
        successful_receipt = int(receipt["status"]) == 1

        transfers = []
        if successful_receipt:
            token = w3.eth.contract(address=token_address, abi=TRANSFER_ABI)
            decoded = token.events.Transfer().process_receipt(receipt, errors=DISCARD)

            receipt_logs_by_index = {
                int(log["logIndex"]): log for log in receipt["logs"]
            }
            for event in decoded:
                args = event["args"]
                original_log = receipt_logs_by_index[int(event["logIndex"])]
                transfers.append(
                    {
                        "token_contract": token_address,
                        "sender": Web3.to_checksum_address(args["from"]),
                        "recipient": Web3.to_checksum_address(args["to"]),
                        "amount_raw": int(args["value"]),
                        "log_index": int(event["logIndex"]),
                        "transaction_hash": tx_hash,
                        "block_number": int(receipt["blockNumber"]),
                        "receipt_status": int(receipt["status"]),
                        "raw_log": {
                            "address": Web3.to_checksum_address(event["address"]),
                            "topics": [Web3.to_hex(topic) for topic in original_log["topics"]],
                            "data": Web3.to_hex(original_log["data"]),
                            "log_index": int(event["logIndex"]),
                            "transaction_index": int(event["transactionIndex"]),
                            "block_number": int(event["blockNumber"]),
                            "block_hash": (
                                Web3.to_hex(event["blockHash"])
                                if event.get("blockHash") else None
                            ),
                            "removed": bool(event.get("removed", False)),
                        },
                    }
                )

        if not successful_receipt:
            result = "FAILED"
            summary = (
                "The transaction reverted on-chain. It cannot be considered "
                "a successful payment."
            )
            observed_amount = None
            difference = None
            matched = False
        else:
            decimals_result = w3.eth.call({"to": token_address, "data": "0x313ce567"})
            if len(decimals_result) < 32:
                raise HTTPException(
                    status_code=422,
                    detail="Token contract returned invalid decimals data",
                )

            token_decimals = int.from_bytes(decimals_result, "big")
            if token_decimals > 36:
                raise HTTPException(
                    status_code=422, detail="Unsupported token decimals"
                )

            expected_sender = (
                Web3.to_checksum_address(payment.expected_sender)
                if payment.expected_sender
                else None
            )
            expected_recipient = Web3.to_checksum_address(payment.expected_recipient)

            relevant = [
                item
                for item in transfers
                if item["recipient"] == expected_recipient
                and (expected_sender is None or item["sender"] == expected_sender)
            ]

            observed_raw = sum(item["amount_raw"] for item in relevant)
            observed_amount = Decimal(observed_raw) / (Decimal(10) ** token_decimals)
            difference = observed_amount - Decimal(payment.expected_amount)

            exact_transfer = (
                bool(relevant)
                and observed_amount == Decimal(payment.expected_amount)
                and tx["to"] is not None
                and Web3.to_checksum_address(tx["to"]) == token_address
            )

            matched = exact_transfer
            result = "MATCHED" if matched else "DISCREPANCY"
            summary = (
                "Verified transfer matches the expected payment."
                if matched
                else "The transaction evidence does not fully match the expected payment."
            )

        now = datetime.now(UTC)

        if case is None:
            case = ReconciliationCase(
                payment_id=payment.id,
                status="OPEN",
                result="PENDING",
                expected_amount=payment.expected_amount,
            )
            db.add(case)
            db.flush()

        case.result = result
        case.status = "RESOLVED" if result in TERMINAL_RESULTS else "OPEN"
        case.expected_amount = payment.expected_amount
        case.observed_amount = observed_amount
        case.difference = difference
        case.summary = summary
        case.resolved_at = now

        inserted_evidence_count = 0
        linked_evidence_count = 0

        for item in transfers:
            evidence = db.scalar(
                select(EvidenceRecord).where(
                    EvidenceRecord.chain_id == actual_chain_id,
                    EvidenceRecord.transaction_hash == tx_hash,
                    EvidenceRecord.log_index == item["log_index"],
                )
            )

            if evidence is None:
                evidence = EvidenceRecord(
                    case_id=case.id,
                    chain_id=actual_chain_id,
                    transaction_hash=tx_hash,
                    block_number=item["block_number"],
                    receipt_status=item["receipt_status"],
                    token_address=item["token_contract"],
                    sender_address=item["sender"],
                    recipient_address=item["recipient"],
                    amount_raw=item["amount_raw"],
                    log_index=item["log_index"],
                    source="rpc_transaction_and_receipt",
                    raw_evidence={
                        "transaction": transaction_evidence,
                        "receipt": receipt_evidence,
                        "transfer_log": item["raw_log"],
                        "transaction_hash": item["transaction_hash"],
                        "sender": item["sender"],
                        "recipient": item["recipient"],
                        "amount_raw": str(item["amount_raw"]),
                        "log_index": item["log_index"],
                    },
                )
                db.add(evidence)
                db.flush()
                inserted_evidence_count += 1

            existing_link = db.scalar(
                select(CaseEvidence.id).where(
                    CaseEvidence.case_id == case.id,
                    CaseEvidence.evidence_id == evidence.id,
                )
            )

            if existing_link is None:
                db.add(
                    CaseEvidence(
                        case_id=case.id,
                        evidence_id=evidence.id,
                    )
                )
                linked_evidence_count += 1

        payment.status = (
            "CONFIRMED"
            if result == "MATCHED"
            else "FAILED"
            if result == "FAILED"
            else "RECONCILIATION_REQUIRED"
        )

        db.add(
            AuditEvent(
                entity_type="reconciliation_case",
                entity_id=str(case.id),
                event_type="RECONCILIATION_" + result,
                actor="system",
                details={
                    "payment_id": str(payment.id),
                    "transaction_hash": tx_hash,
                    "chain_id": actual_chain_id,
                    "receipt_status": int(receipt["status"]),
                    "expected_amount": str(payment.expected_amount),
                    "observed_amount": (
                        str(observed_amount) if observed_amount is not None else None
                    ),
                    "transfer_event_count": len(transfers),
                    "new_evidence_count": inserted_evidence_count,
                    "linked_evidence_count": linked_evidence_count,
                },
            )
        )

        db.commit()
        db.refresh(case)
        db.refresh(payment)

        response = case_response(db, payment, case)
        response["receipt_status"] = int(receipt["status"])
        response["transfer_event_count"] = len(transfers)
        return response

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Reconciliation failed for payment %s", payment_id)
        raise HTTPException(
            status_code=502,
            detail=f"Reconciliation could not be completed: {type(exc).__name__}: {exc!r}",
        ) from exc
