import httpx

from app.core.config import settings


class MetaAPIError(Exception):
    """Raised when the Meta Model API request fails."""


class MetaClient:
    def __init__(self) -> None:
        self.base_url = settings.model_base_url.rstrip("/")
        self.model = settings.model_name

    async def generate(
        self,
        prompt: str,
        output_schema: dict | None = None,
    ) -> dict:
        if settings.model_api_key is None:
            raise MetaAPIError("MODEL_API_KEY is not configured.")

        headers = {
            "Authorization": (
                f"Bearer {settings.model_api_key.get_secret_value()}"
            ),
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "input": prompt,
        }

        if output_schema is not None:
            payload["text"] = {
                "format": {
                    "type": "json_schema",
                    "name": "chainguard_investigation",
                    "schema": output_schema,
                    "strict": False,
                }
            }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/responses",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                return response.json()

        except httpx.HTTPStatusError as exc:
            raise MetaAPIError(
                f"Meta API returned HTTP {exc.response.status_code}."
            ) from exc
        except httpx.RequestError as exc:
            raise MetaAPIError(
                "Could not connect to the Meta Model API."
            ) from exc


def extract_output_text(response: dict) -> str:
    """Extract assistant text from a Responses API result."""
    parts = []

    for item in response.get("output", []):
        if item.get("type") != "message":
            continue

        for content in item.get("content", []):
            if content.get("type") == "output_text":
                parts.append(content.get("text", ""))

    if not parts:
        raise MetaAPIError("Meta API returned no assistant text.")

    return "\n".join(parts)
