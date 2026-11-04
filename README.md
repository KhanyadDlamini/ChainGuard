# ChainGuard

AI-powered blockchain reconciliation and investigation platform. ChainGuard
registers expected payments, verifies them against on-chain evidence, and —
when amounts don't line up — produces deterministic investigation reports plus
AI-generated hypotheses about what may have happened.

Core principle: **evidence before conclusions.** Verified on-chain facts stay
separate from AI assessments, and the AI never claims fraud, intent, or
responsibility.

## How it works

```
Expected payment (register) ──► Reconcile ──► MATCHED
        │                        │              (payment confirmed)
        │                        ▼
        │                     DISCREPANCY ──► Deterministic report ──► AI assessment
        │                     (case opened)   (facts + findings)      (hypotheses +
        │                                                             next evidence)
        ▼
On-chain evidence (ERC-20 Transfer events, receipts) persisted per case
```

1. **Register** an expected payment: amount, asset, token, parties, tx hash.
2. **Reconcile**: the backend fetches the transaction receipt from the chain,
   decodes ERC-20 `Transfer` events, and compares observed vs expected amounts.
   Every transfer becomes a persisted, auditable evidence record.
3. **Investigate**: a deterministic report states only what the stored records
   establish. A Meta AI assessment then proposes testable hypotheses and the
   evidence needed to distinguish them.

## Tech stack

| Layer    | Technology                                                        |
|----------|-------------------------------------------------------------------|
| Chain    | Hardhat 3, ethers v6, OpenZeppelin 5, Ganache (chain 1337)        |
| Backend  | FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 16, web3.py            |
| AI       | Meta Muse Spark (`muse-spark-1.3`) via structured JSON output     |
| Frontend | Next.js 16, React 19, Tailwind CSS 4                              |

## Quickstart

Prerequisites: Node 20+, Python 3.12 with `uv` ([install](https://docs.astral.sh/uv/)),
Docker (or any Postgres 16), Ganache (`npm i -g ganache`).

```bash
# 0. Environment files (repo root — do this first)
cp .env.example .env
cp backend/.env.example backend/.env
# Edit .env: set CHAINGUARD_DB_PASSWORD to any local password.
# Edit backend/.env: put the SAME password into DATABASE_URL,
# replacing "change-me". (MODEL_API_KEY can wait — only AI needs it.)

# 1. Database
docker compose up -d postgres

# 2. Local chain, persisted (new terminal, keep running)
ganache --chain.chainId 1337 --server.port 8545 --database.dbPath .ganache-data

# 3. Deploy token (new terminal)
cd contracts && npm install
npm run deploy:local
# Copy "contractAddress" from contracts/deployments/chainguard-local.json
# into backend/.env as CHAINGUARD_TOKEN_ADDRESS.

# 4. Backend (new terminal, from repo root)
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000

# 5. Frontend (new terminal, from repo root)
cd frontend && npm install
npm run dev   # serves on http://127.0.0.1:3001

# 6. Seed the demo (new terminal, from repo root)
python3 scripts/seed-demo.py
```

The seed script creates a fresh transfer, a MATCHED and a DISCREPANCY
payment, a deterministic report, and an AI assessment — and prints the
dossier URL. It skips redeploying when the recorded token is still live;
when it does deploy, restart the backend once and re-run the script.

Then open **http://127.0.0.1:3001** in a browser. The Connections page
confirms all services are healthy. Interactive API docs live at
**http://127.0.0.1:8000/docs**.

`MODEL_API_KEY` in `backend/.env` unlocks AI assessments; everything else
works without it.

## Guided demo

Follow [docs/demo-guide.md](docs/demo-guide.md) for the full judge
walkthrough: register a payment, reconcile a match and a shortfall, generate a
deterministic report, and request an AI assessment — all from the browser.

## Project structure

```
contracts/   ERC-20 test token, deploy + transfer-seed scripts
backend/     FastAPI app (payments, reconciliation, investigations, AI),
             SQLAlchemy models, Alembic migrations, pytest suite
frontend/    Next.js dashboard (overview, payments, investigations,
             evidence, connections)
docs/        Demo guide and supporting documentation
scripts/     One-command demo seeding
compose.yaml Local Postgres service
```

Chain state persists in `.ganache-data/` (git-ignored), so restarts keep
the token and transfers. The API is a localhost-only demo service without
authentication — do not expose port 8000 beyond your machine.

## API overview

- `POST /api/v1/payments` — register an expected payment
- `POST /api/v1/payments/{id}/reconcile` — reconcile against chain evidence
  (idempotent: terminal results replay without duplicating evidence)
- `GET /api/v1/investigations/cases` — list reconciliation cases
- `POST /api/v1/investigations/cases/{id}` — deterministic report
- `POST /api/v1/investigations/cases/{id}/ai` — Meta AI assessment
- `GET /api/v1/evidence` — persisted evidence records
- `GET /api/v1/blockchain/status`, `/api/v1/database/status`,
  `/api/v1/model/info` — service health

## Tests

```bash
cd backend && uv run pytest
```
