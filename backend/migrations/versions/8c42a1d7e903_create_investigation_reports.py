"""Create persisted investigation reports."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "8c42a1d7e903"
down_revision: Union[str, Sequence[str], None] = "25fa0f56a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "investigation_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("reconciliation_cases.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("report_type", sa.String(length=40), nullable=False),
        sa.Column("report", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_investigation_reports_case_created",
        "investigation_reports",
        ["case_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_investigation_reports_case_created",
        table_name="investigation_reports",
    )
    op.drop_table("investigation_reports")
