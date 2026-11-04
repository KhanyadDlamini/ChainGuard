# ChainGuard Demo Guide (for judges)

A 10-minute, browser-only walkthrough of everything ChainGuard does. All
services are assumed running per the Quickstart in the root README:

- App: **http://127.0.0.1:3001**
- API docs: **http://127.0.0.1:8000/docs**

## Step 0 — Confirm the system is healthy

Open **Connections** in the sidebar. You should see 3/3 services up:
API, blockchain (chain 1337, contract deployed), and PostgreSQL, plus the
active AI model. If anything shows down, check the Troubleshooting section
below.

## Step 1 — Register a payment

Open **Payments**. The **Register payment** form is pre-filled with the local
demo chain values (token, sender, recipient, tx hash). Just press **Register
payment**.

Expected: a green confirmation and the new row at the top of the table with
status `PENDING`.

## Step 2 — Reconcile a match

In the new row, press **Reconcile**.

Expected: result `MATCHED`, observed `50`, difference `0`, 1 evidence record.
The row status flips to `CONFIRMED`. This proves the expected payment equals
the on-chain transfer.

## Step 3 — Reconcile a shortfall

Back in the form, press **Shortfall · 100 CGT**, then **Register payment**,
then **Reconcile** on the new row.

Expected: result `DISCREPANCY`, observed `50`, difference `-50`. The row
status becomes `RECONCILIATION_REQUIRED` and a case is opened. The same
on-chain transaction is reused on purpose: the evidence is real, the
expectation is wrong — exactly the situation investigators face.

## Step 4 — Generate a deterministic report

Open **Investigations**. Find the discrepancy case and press **Dossier** to
open its full case page (or press **Report** for a quick inline result).

Expected on the dossier: section **01 · Verified findings** with code
`AMOUNT_DISCREPANCY`, severity, a plain explanation of the shortfall, and the
count of linked evidence items. Note what it does *not* do: no guessing at
causes, no blame. Unknowns and limitations are recorded explicitly.

## Step 5 — Request an AI assessment

On the dossier page, press **Request AI assessment** (requires the report
from Step 4).

Expected: within ~30 seconds, section **02 · AI assessment** appears with a
layered reading order — executive summary first, then 2–4 numbered
hypotheses (e.g. partial payment, split payment, recording mismatch), each
with a confidence badge, supporting vs contradicting evidence side by side,
and still-unresolved questions — followed by key observations, concrete
evidence to gather next, limitations, and model provenance. The AI can never
mark fraud or responsibility as established; the API schema forbids it.

## Step 6 — Inspect the evidence

Open **Evidence**. Each row is one decoded on-chain `Transfer` event tied to
a case: tx hash, block, receipt status, sender, recipient, raw amount, log
index. This is the immutable basis everything above was built on.

## Step 7 — Review the overview

Open **Overview** to see the updated counts: payments monitored,
discrepancies, investigations (deterministic + AI), and evidence records —
with the new activity at the top of both tables.

## Troubleshooting

- **Reconcile returns `UNVERIFIED`**: the tx hash isn't on the connected
  chain. Run `python3 scripts/seed-demo.py` from the repo root — it redeploys
  if needed, updates `backend/.env`, and prints fresh form values. Restart
  the backend if the script asks, then re-run it.
- **Ganache was restarted and the token is gone**: restart it with the
  persisted command from the README (`--database.dbPath .ganache-data`),
  then run the seed script.
- **AI assess fails with 503**: `MODEL_API_KEY` is missing in `backend/.env`.
  Everything else works without it.
- **Reconcile says "replayed"**: terminal results (`MATCHED`, `DISCREPANCY`,
  `FAILED`) are idempotent — re-running returns the stored outcome without
  duplicating evidence. Register a new payment to see a fresh run.
- **Port already in use**: another instance is running. Reuse it (all state
  is in Postgres/Ganache) rather than starting a second one.

## For the curious

- Interactive API: http://127.0.0.1:8000/docs
- Re-runnable script of Steps 1–5: `python3 scripts/seed-demo.py` from the repo root
  (fresh transfer → MATCHED → DISCREPANCY → report → AI assessment → dossier URL)
- Backend tests: `cd backend && uv run pytest`
