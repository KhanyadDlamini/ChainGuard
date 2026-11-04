from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_matching_payment():
    response = client.post(
        "/api/v1/reconciliation/compare",
        json={
            "payment_id": "CG-TEST-MATCH",
            "expected_amount": "100",
            "observed_amount": "100",
            "asset": "CGT",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "MATCHED"
    assert data["difference"] == "0"
    assert data["investigation_required"] is False


def test_amount_discrepancy():
    response = client.post(
        "/api/v1/reconciliation/compare",
        json={
            "payment_id": "CG-TEST-MISMATCH",
            "expected_amount": "100",
            "observed_amount": "80",
            "asset": "CGT",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "DISCREPANCY"
    assert data["difference"] == "20"
    assert data["investigation_required"] is True


def test_rejects_zero_expected_amount():
    response = client.post(
        "/api/v1/reconciliation/compare",
        json={
            "payment_id": "CG-TEST-INVALID",
            "expected_amount": "0",
            "observed_amount": "0",
            "asset": "CGT",
        },
    )

    assert response.status_code == 422
