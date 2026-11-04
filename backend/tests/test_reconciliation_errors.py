"""Unexpected-failure responses from reconcile must not leak internals."""

from unittest.mock import MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db.dependencies import get_db
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

SENTINEL = "SENTINEL-internal-postgres://db.internal:5432/secret"


def _failing_db():
    db = MagicMock()
    db.scalar.side_effect = RuntimeError(SENTINEL)
    return db


def test_reconcile_unexpected_error_returns_generic_message():
    payment_id = uuid4()
    app.dependency_overrides[get_db] = _failing_db
    try:
        response = client.post(f"/api/v1/payments/{payment_id}/reconcile")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 502
    body = response.text
    assert SENTINEL not in body
    assert "Traceback" not in body
    assert "RuntimeError" not in body
    assert str(payment_id) in body
