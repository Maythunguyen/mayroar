from ...core.database import Store


async def clear_diary_data(db: Store):
    # One database transaction; RPC derives ownership from auth.uid().
    await db.call("POST", "rpc/diary_clear_data", body={})
