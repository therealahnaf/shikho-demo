# StudyCircle

StudyCircle is Shikho's Class 10 Mathematics community experience. Students create a lightweight local identity, join the seeded `Math Champions` cohort, and view its mission, daily quest, roadmap, leaderboard, Mentor, streak, and recent activity.

## Prerequisites

- Node.js 22+
- Python 3.11+
- [uv](https://docs.astral.sh/uv/)
- The existing Docker container `pg`, exposing PostgreSQL on host port `15432`
- Local PostgreSQL credentials `postgres` / `postgres`

The repository uses the externally managed PostgreSQL container and does not create another database service.

## First-time setup

Create the shared development and test database if it does not already exist:

```powershell
docker exec pg createdb -U postgres studycircle_demo
```

If PostgreSQL reports that the database already exists, continue.

Prepare and seed the backend:

```powershell
cd backend
uv sync
Copy-Item .env.example .env
uv run alembic upgrade head
uv run python -m app.scripts.seed_demo
```

Prepare the frontend:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

## Run locally

Backend, from `backend/`:

```powershell
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, from `frontend/`:

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). API documentation is at [http://localhost:8000/api/docs](http://localhost:8000/api/docs).

## UI components

The frontend uses components installed from the official shadcn registry. Add another primitive from `frontend/` with:

```powershell
npx shadcn@latest add <component>
```

Registry configuration is in `frontend/components.json`. Shikho brand colors are mapped to shadcn semantic tokens in `frontend/src/styles.css`.

## Verify

Backend tests run serially against `studycircle_demo` and roll back their changes. Do not run them while manually changing the same database.

```powershell
cd backend
uv run alembic upgrade head
uv run alembic check
uv run pytest
```

```powershell
cd frontend
npm test -- --run
npm run build
```

Manual acceptance:

1. Run the seed command twice and confirm the reported entity counts are unchanged.
2. Create a student identity and save its generated access key.
3. Select **Explore StudyCircle**, view `Math Champions`, and join.
4. Verify the mission, quest, streak, roadmap, leaderboard, Mentor, and recent activity sections.
5. Refresh the browser and restart FastAPI; the membership must remain available.
6. Repeat the join request and confirm member and activity counts do not duplicate.
7. Clear browser storage, sign in with the username and access key, and verify the Circle Home restores.

## Scope and security

- The username and access-key mechanism is intentionally lightweight. Keys are stored as plain text and must not be treated as production authentication.
- There is no recovery, rotation, expiry, password, JWT, OTP, or Shikho account integration.
- Learning activities, notes, score mutations, roadmap editing, and real-time updates are outside the current scope.
- Development and serial backend tests share one PostgreSQL database by project decision.
