import json
from typing import Any

import httpx

from ..core.config import Settings
from ..core.errors import ServiceError


async def request_structured_output(
    http: httpx.AsyncClient,
    cfg: Settings,
    *,
    instructions: str,
    content: list[dict[str, Any]],
    schema_name: str,
    schema: dict[str, Any],
    max_output_tokens: int = 1600,
) -> dict[str, Any]:
    response = await http.post(
        "https://api.openai.com/v1/responses",
        headers={
            "Authorization": f"Bearer {cfg.openai_api_key}",
        },
        timeout=60,
        json={
            "model": cfg.openai_model,
            "store": False,
            "max_output_tokens": max_output_tokens,
            "instructions": instructions,
            "input": [
                {
                    "role": "user",
                    "content": content,
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "strict": True,
                    "schema": schema,
                },
            },
        },
    )

    if response.is_error:
        raise ServiceError(
            502,
            "AI provider request failed.",
        )

    try:
        result = response.json()

        if not isinstance(result, dict):
            raise ValueError("Invalid response.")

        if result.get("status") != "completed":
            raise ValueError("Incomplete response.")

        text_parts = []

        for output in result.get("output", []):
            for part in output.get("content", []):
                if part.get("type") == "refusal":
                    raise ValueError("Provider declined the request.")

                if part.get("type") == "output_text":
                    text_parts.append(part["text"])

        parsed = json.loads("".join(text_parts))

        if not isinstance(parsed, dict):
            raise ValueError("Expected a JSON object.")

        return parsed

    except (ValueError, KeyError, TypeError, AttributeError):
        raise ServiceError(
            502,
            "AI provider returned an unusable response. Please try again.",
        ) from None