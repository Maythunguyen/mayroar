import re
from ...core.errors import ServiceError

def pattern(term: str) -> str:
    escaped = re.sub(r'[\\%_*]', lambda m: '\\' + m[0], term).replace('"', '\\"')
    return '"*' + escaped + '*"'

def search_params(q: str, barcode: str | None):
    params = {"select": "*", "order": "name.asc,id.asc", "limit": "30"}
    if barcode is not None:
        if not re.fullmatch(r"[0-9]{8,14}", barcode):
            raise ServiceError(422, "Enter a barcode with 8 to 14 digits.")
        codes = [barcode]
        if len(barcode) == 12:
            codes.append("0" + barcode)
        elif len(barcode) == 13 and barcode.startswith("0"):
            codes.append(barcode[1:])
        params["barcode"] = "in.(" + ",".join(codes) + ")"
    else:
        words = q.strip().split()[:6]
        if not words:
            raise ServiceError(422, "Type a food or brand name.")
        params["and"] = "(" + ",".join(f"or(name.ilike.{pattern(w)},brand.ilike.{pattern(w)})" for w in words) + ")"
    return params
