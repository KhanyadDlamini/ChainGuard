"""Browser calls hit the API cross-origin, so CORS must allow the UI."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ORIGIN = "http://127.0.0.1:3001"


def test_cors_preflight_allows_frontend_origin():
    response = client.options(
        "/api/v1/payments",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGIN


def test_cors_headers_present_on_get():
    response = client.get("/health", headers={"Origin": ORIGIN})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGIN
