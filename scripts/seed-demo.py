#!/usr/bin/env python3
"""Seed a reproducible ChainGuard demo.

Creates a fresh on-chain transfer, then a MATCHED payment and a DISCREPANCY
payment against it, plus a deterministic report and AI assessment on the
discrepancy case — so the dossier is fully pre-baked for judging.

Deploy-aware: skips redeploy when the recorded token is still live on the
chain AND matches the running backend's configuration. When a deploy is
needed, updates backend/.env and asks for a backend restart + re-run.

Usage (from repo root, with Ganache and the API running):
    python3 scripts/seed-demo.py
"""

import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "http://127.0.0.1:8000"
FRONTEND = "http://127.0.0.1:3001"


def api(method, path, body=None, timeout=60):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()[:300]


def run(cmd, cwd):
    print(f"$ {' '.join(cmd)}  (in {cwd})")
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stdout[-2000:])
        print(proc.stderr[-2000:], file=sys.stderr)
        sys.exit(f"FAILED: {' '.join(cmd)} (exit {proc.returncode})")
    return proc.stdout


def set_env_token(address):
    """Set CHAINGUARD_TOKEN_ADDRESS in backend/.env, preserving the rest."""
    env_path = ROOT / "backend" / ".env"
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    key = "CHAINGUARD_TOKEN_ADDRESS="
    updated = [f"{key}{address}" if line.startswith(key) else line for line in lines]
    if not any(line.startswith(key) for line in lines):
        updated.append(f"{key}{address}")
    env_path.write_text("\n".join(updated) + "\n")
    print(f"backend/.env: CHAINGUARD_TOKEN_ADDRESS={address}")


def main():
    try:
        status, health = api("GET", "/health", timeout=10)
    except OSError:
        sys.exit("API is not reachable at " + API + " — start the backend first.")
    assert status == 200, health

    status, chain = api("GET", "/api/v1/blockchain/status", timeout=15)
    assert status == 200, chain
    backend_token = chain["token_address"]
    print(f"chain: id={chain['chain_id']} verified={chain['contract_verified']} block={chain['latest_block']}")

    deployment_path = ROOT / "contracts" / "deployments" / "chainguard-local.json"
    recorded = json.loads(deployment_path.read_text())["contractAddress"] if deployment_path.exists() else None

    if recorded and recorded.lower() == backend_token.lower() and chain["contract_verified"]:
        token = recorded
        print(f"recorded token {token} is live — skipping deploy")
    else:
        print("deploying fresh token...")
        run(["npm", "run", "deploy:local"], cwd=ROOT / "contracts")
        token = json.loads(deployment_path.read_text())["contractAddress"]
        set_env_token(token)
        sys.exit(
            "Deployed a new token. Restart the backend to pick up the new "
            "address, then re-run this script."
        )

    print("seeding transfer...")
    run(["npm", "run", "seed:transfer"], cwd=ROOT / "contracts")
    transfer = json.loads((ROOT / "contracts" / "deployments" / "last-transfer.json").read_text())
    tx, sender, recipient = transfer["transactionHash"], transfer["sender"], transfer["recipient"]
    amount = Decimal(transfer["amount"])
    shortfall = str(amount * 2)
    print(f"transfer: {amount} CGT  {sender} -> {recipient}\n  tx {tx}")

    stamp = int(time.time())

    def register(ref, expected):
        status, payment = api("POST", "/api/v1/payments", {
            "external_reference": ref, "chain_id": transfer["chainId"],
            "asset_symbol": "CGT", "token_address": token,
            "expected_amount": str(expected), "expected_sender": sender,
            "expected_recipient": recipient, "expected_tx_hash": tx,
        })
        assert status == 201, (status, payment)
        status, result = api("POST", f"/api/v1/payments/{payment['id']}/reconcile", {})
        assert status == 200, (status, result)
        print(f"{ref}: {result['result']} (observed={result['observed_amount']})")
        return result

    match = register(f"SEED-MATCH-{stamp}", amount)
    disc = register(f"SEED-SHORT-{stamp}", shortfall)
    assert match["result"] == "MATCHED", match
    assert disc["result"] == "DISCREPANCY", disc

    status, report = api("POST", f"/api/v1/investigations/cases/{disc['case_id']}", {})
    assert status == 201, (status, report)
    print(f"deterministic report: {report['investigation_id']}")

    status, ai = api("POST", f"/api/v1/investigations/cases/{disc['case_id']}/ai", {}, timeout=150)
    if status == 201:
        print(f"AI assessment ({ai['model']}): {ai['ai_investigation_id']}")
    else:
        print(f"WARNING: AI assessment skipped (HTTP {status}): {ai}")
        print("Set MODEL_API_KEY in backend/.env and use the dossier button later.")

    print("\nDone. Open the pre-baked discrepancy dossier:")
    print(f"  {FRONTEND}/investigations/{disc['case_id']}")
    print("\nForm values for manual entries:")
    print(f"  token={token}\n  sender={sender}\n  recipient={recipient}\n  tx={tx}")


if __name__ == "__main__":
    main()
