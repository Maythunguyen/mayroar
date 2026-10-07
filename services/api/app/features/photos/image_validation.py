import base64
import binascii
import io
import warnings
from PIL import Image, UnidentifiedImageError
from ...core.errors import ServiceError
Image.MAX_IMAGE_PIXELS = 20_000_000

def validate_image(data_url: str):
    try:
        header, encoded = data_url.split(",", 1)
        mime = header.removeprefix("data:").removesuffix(";base64")
        formats = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
        if header != f"data:{mime};base64" or mime not in formats:
            raise ValueError()
        raw = base64.b64decode(encoded, validate=True)
        if not 0 < len(raw) <= 5 * 1024 * 1024:
            raise ValueError()
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as img:
                if img.format != formats[mime] or getattr(img, "n_frames", 1) != 1:
                    raise ValueError()
                if img.width * img.height > 20_000_000:
                    raise ValueError()
                img.verify()
    except (ValueError, binascii.Error, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ServiceError(422, "Choose a valid, non-animated JPG, PNG or WebP under 5 MB and 20 megapixels.") from None
