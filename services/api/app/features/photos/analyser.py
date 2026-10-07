import httpx
from pydantic import ValidationError

from ...core.config import Settings
from ...core.errors import ServiceError
from ...integrations.openai import request_structured_output
from .prompts import NUTRITION_INSTRUCTIONS
from .schemas import Estimate, ESTIMATE_OUTPUT_SCHEMA


async def estimate_photo(
    http: httpx.AsyncClient,
    cfg: Settings,
    image: str,
    notes: str,
) -> Estimate:
    result = await request_structured_output(
        http,
        cfg,
        instructions=NUTRITION_INSTRUCTIONS,
        content=[
            {
                "type": "input_text",
                "text": f"Portion notes: {notes or 'None'}",
            },
            {
                "type": "input_image",
                "image_url": image,
            },
        ],
        schema_name="meal_estimate",
        schema=ESTIMATE_OUTPUT_SCHEMA,
    )

    try:
        return Estimate.model_validate(result)

    except ValidationError:
        raise ServiceError(
            502,
            "The photo returned an invalid nutrition estimate. "
            "Try a clearer image.",
        ) from None