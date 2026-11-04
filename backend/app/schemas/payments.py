import re
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

ADDRESS_PATTERN = re.compile(r"^0x[0-9a-fA-F]{40}$")
TX_HASH_PATTERN = re.compile(r"^0x[0-9a-fA-F]{64}$")


class PaymentCreate(BaseModel):
    external_reference: str = Field(min_length=1, max_length=120)
    chain_id: int = Field(gt=0)
    asset_symbol: str = Field(min_length=1, max_length=20)
    token_address: str
    expected_amount: Decimal = Field(gt=0, max_digits=36, decimal_places=18)
    expected_sender: str | None = None
    expected_recipient: str
    expected_tx_hash: str | None = None

    @field_validator("token_address", "expected_recipient")
    @classmethod
    def validate_address(cls, value: str) -> str:
        if not ADDRESS_PATTERN.fullmatch(value):
            raise ValueError("Must be a valid 20-byte hexadecimal address")
        return value

    @field_validator("expected_sender")
    @classmethod
    def validate_sender(cls, value: str | None) -> str | None:
        if value is not None and not ADDRESS_PATTERN.fullmatch(value):
            raise ValueError("Must be a valid 20-byte hexadecimal address")
        return value

    @field_validator("expected_tx_hash")
    @classmethod
    def validate_transaction_hash(cls, value: str | None) -> str | None:
        if value is not None and not TX_HASH_PATTERN.fullmatch(value):
            raise ValueError("Must be a 32-byte hexadecimal transaction hash")
        return value


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    external_reference: str
    chain_id: int
    asset_symbol: str
    token_address: str
    expected_amount: Decimal
    expected_sender: str | None
    expected_recipient: str
    expected_tx_hash: str | None
    status: str
