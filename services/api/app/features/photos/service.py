from asyncio import to_thread

from ...core.config import settings
from ...core.database import Store
from ...core.errors import ServiceError
from . import repository
from .analyser import estimate_photo
from .image_validation import validate_image
from .schemas import Estimate, PhotoRequest


async def analyse(
    body: PhotoRequest,
    db: Store,
) -> Estimate:
    cfg = settings()

    if not cfg.openai_api_key:
        raise ServiceError(
            503,
            "Photo analysis is not configured on the server.",
        )

    await to_thread(validate_image, body.image)

    permitted = await repository.claim_attempt(db)

    if not permitted:
        raise ServiceError(
            429,
            "Photo limit reached. Wait a minute or try tomorrow "
            "(10 attempts per UTC day).",
        )

    return await estimate_photo(
        http=db.client.http,
        cfg=cfg,
        image=body.image,
        notes=body.notes,
    )