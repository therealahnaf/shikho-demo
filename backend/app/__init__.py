"""StudyCircle demo API."""

import asyncio
import sys

# Psycopg's async implementation requires a selector loop on Windows. Setting the
# policy at package import keeps Alembic, Uvicorn, scripts, and pytest consistent.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
