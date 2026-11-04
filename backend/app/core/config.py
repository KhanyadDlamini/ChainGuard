from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    database_url: str

    model_api_key: SecretStr | None = None
    model_base_url: str = "https://api.meta.ai" + "/v1"
    model_name: str = "muse-spark-1.3"

    chainguard_rpc_url: str = "http://127.0.0.1:8545"
    chainguard_chain_id: int = 1337
    chainguard_token_address: str = "0x681E80b26B8ceDDa33367e2E156903D7240ebdAe"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
