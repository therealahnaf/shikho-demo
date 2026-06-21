from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.db import engine


async def verify_phase_zero() -> None:
    async with engine.connect() as connection:
        database_name = await connection.scalar(text("SELECT current_database()"))
        table_name = await connection.scalar(
            text("SELECT to_regclass('public.demo_users')::text")
        )
        revision = await connection.scalar(
            text("SELECT version_num FROM alembic_version LIMIT 1")
        )

    if table_name != "demo_users":
        raise SystemExit("demo_users is missing; run `alembic upgrade head` first.")
    print(
        f"Phase 0 ready: database={database_name}, revision={revision}, "
        "seeded_product_rows=0"
    )


def main() -> None:
    asyncio.run(verify_phase_zero())


if __name__ == "__main__":
    main()

