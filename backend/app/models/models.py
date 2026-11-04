import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("expected_amount > 0", name="ck_payments_expected_amount_positive"),
        Index("ix_payments_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_reference: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    chain_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    asset_symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    token_address: Mapped[str] = mapped_column(String(42), nullable=False)
    expected_amount: Mapped[object] = mapped_column(Numeric(36, 18), nullable=False)
    expected_sender: Mapped[str | None] = mapped_column(String(42))
    expected_recipient: Mapped[str] = mapped_column(String(42), nullable=False)
    expected_tx_hash: Mapped[str | None] = mapped_column(String(66))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ReconciliationCase(Base):
    __tablename__ = "reconciliation_cases"
    __table_args__ = (
        UniqueConstraint("payment_id", name="uq_reconciliation_cases_payment_id"),
        Index("ix_cases_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="OPEN")
    result: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    expected_amount: Mapped[object] = mapped_column(Numeric(36, 18), nullable=False)
    observed_amount: Mapped[object | None] = mapped_column(Numeric(36, 18))
    difference: Mapped[object | None] = mapped_column(Numeric(36, 18))
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"
    __table_args__ = (
        UniqueConstraint("chain_id", "transaction_hash", "log_index", name="uq_evidence_chain_tx_log"),
        Index("ix_evidence_transaction_hash", "transaction_hash"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reconciliation_cases.id", ondelete="RESTRICT"), nullable=False)
    chain_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    transaction_hash: Mapped[str] = mapped_column(String(66), nullable=False)
    block_number: Mapped[int] = mapped_column(BigInteger, nullable=False)
    receipt_status: Mapped[int] = mapped_column(Integer, nullable=False)
    token_address: Mapped[str] = mapped_column(String(42), nullable=False)
    sender_address: Mapped[str] = mapped_column(String(42), nullable=False)
    recipient_address: Mapped[str] = mapped_column(String(42), nullable=False)
    amount_raw: Mapped[int] = mapped_column(Numeric(78, 0), nullable=False)
    log_index: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(60), nullable=False, default="rpc_transaction_and_receipt")
    raw_evidence: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_entity_created", "entity_type", "entity_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(80), nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    actor: Mapped[str] = mapped_column(String(120), nullable=False, default="system")
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class InvestigationReport(Base):
    __tablename__ = "investigation_reports"
    __table_args__ = (
        Index("ix_investigation_reports_case_created", "case_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reconciliation_cases.id", ondelete="RESTRICT"),
        nullable=False,
    )
    report_type: Mapped[str] = mapped_column(
        String(40), nullable=False, default="DETERMINISTIC"
    )
    report: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class CaseEvidence(Base):
    __tablename__ = "case_evidence"

    __table_args__ = (
        UniqueConstraint(
            "case_id",
            "evidence_id",
            name="uq_case_evidence_case_evidence",
        ),
        Index("ix_case_evidence_evidence_id", "evidence_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reconciliation_cases.id", ondelete="RESTRICT"),
        nullable=False,
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence_records.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class AIInvestigation(Base):
    __tablename__ = "ai_investigation_assessments"

    __table_args__ = (
        Index(
            "ix_ai_assessments_report_created",
            "investigation_report_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    investigation_report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("investigation_reports.id", ondelete="RESTRICT"),
        nullable=False,
    )

    provider: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="meta",
    )

    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    prompt_version: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    assessment: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
