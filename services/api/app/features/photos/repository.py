from ...core.database import Store

async def claim_attempt(db: Store) -> bool:
    return await db.call("POST", "rpc/diary_claim_photo", body={})
