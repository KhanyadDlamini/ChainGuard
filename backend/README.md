# ChainGuard backend

FastAPI service: payments, evidence-driven reconciliation, deterministic and
AI-assisted investigations. See the root README for the full quickstart.

```bash
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
uv run pytest
```
