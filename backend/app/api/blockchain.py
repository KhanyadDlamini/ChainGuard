from app.core.config import settings

from fastapi import APIRouter, HTTPException
from web3 import Web3

router = APIRouter(prefix="/api/v1/blockchain", tags=["Blockchain Evidence"])

RPC_URL = settings.chainguard_rpc_url
EXPECTED_CHAIN_ID = settings.chainguard_chain_id
TOKEN_ADDRESS = settings.chainguard_token_address

TRANSFER_TOPIC = Web3.keccak(
    text="Transfer(address,address,uint256)"
).hex().lower()


def connect():
    w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 4}))
    if not w3.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain RPC unavailable")
    return w3


@router.get("/status")
def blockchain_status():
    try:
        w3 = connect()
        chain_id = w3.eth.chain_id
        address = Web3.to_checksum_address(TOKEN_ADDRESS)
        code = w3.eth.get_code(address)
        deployed = len(code) > 0

        return {
            "rpc_connected": True,
            "rpc_url": RPC_URL,
            "chain_id": chain_id,
            "expected_chain_id": EXPECTED_CHAIN_ID,
            "chain_matches": chain_id == EXPECTED_CHAIN_ID,
            "token_address": address,
            "contract_deployed": deployed,
            "contract_verified": deployed and chain_id == EXPECTED_CHAIN_ID,
            "latest_block": w3.eth.block_number,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to inspect blockchain: {type(exc).__name__}",
        ) from exc


@router.get("/transactions/{tx_hash}")
def inspect_transaction(tx_hash: str):
    if not tx_hash.startswith("0x") or len(tx_hash) != 66:
        raise HTTPException(status_code=400, detail="Invalid transaction hash")

    try:
        w3 = connect()
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        tx = w3.eth.get_transaction(tx_hash)

        address = Web3.to_checksum_address(TOKEN_ADDRESS)
        code = w3.eth.get_code(address)
        contract_deployed = len(code) > 0
        transfers = []

        for log in receipt["logs"]:
            topics = log["topics"]
            if (
                Web3.to_checksum_address(log["address"]) != address
                or len(topics) != 3
                or topics[0].hex().lower() != TRANSFER_TOPIC
            ):
                continue

            transfers.append({
                "token_contract": address,
                "from": Web3.to_checksum_address("0x" + topics[1].hex()[-40:]),
                "to": Web3.to_checksum_address("0x" + topics[2].hex()[-40:]),
                "amount_raw": str(int(log["data"].hex() or "0x0", 16)),
                "log_index": log["logIndex"],
            })

        return {
            "transaction_hash": tx_hash,
            "chain_id": w3.eth.chain_id,
            "block_number": receipt["blockNumber"],
            "transaction_status": (
                "SUCCESS" if receipt["status"] == 1 else "FAILED"
            ),
            "receipt_status": receipt["status"],
            "from": tx["from"],
            "to": tx["to"],
            "token_contract": address,
            "contract_deployed": contract_deployed,
            "transfer_events": transfers,
            "evidence_source": "rpc_transaction_and_receipt",
        }
    except HTTPException:
        raise
    except Exception as exc:
        if type(exc).__name__ in ("TransactionNotFound",):
            raise HTTPException(
                status_code=404, detail="Transaction not found on connected chain"
            ) from exc
        raise HTTPException(
            status_code=502,
            detail=f"Unable to inspect transaction: {type(exc).__name__}",
        ) from exc
