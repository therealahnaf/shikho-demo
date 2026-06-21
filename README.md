# StudyCircle Demo

Phase 0 implements a lightweight demo identity for the StudyCircle community concept. It uses a username and generated access key, persists identities in PostgreSQL, and stops at a protected placeholder for Phase 1.

## Prerequisites

- Node.js 22+
- Python 3.11
- The existing Docker container `pg` running PostgreSQL on host port `15432`
- PostgreSQL credentials `postgres` / `postgres` for this local demo instance

The application deliberately does not include its own PostgreSQL container.

## First-time setup

Create the single application/test database if it does not already exist:

```powershell
docker exec pg createdb -U postgres studycircle_demo
```

If the command reports that the database exists, continue.

Set up and migrate the backend:

```powershell
cd backend
uv sync
Copy-Item .env.example .env
uv run alembic upgrade head
uv run python -m app.scripts.seed_demo
```

Set up the frontend:

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

Open [http://localhost:5173](http://localhost:5173). API documentation is available at [http://localhost:8000/api/docs](http://localhost:8000/api/docs).

## UI components

The frontend uses components installed from the official shadcn registry. Add future primitives from `frontend/` with:

```powershell
npx shadcn@latest add <component>
```

The registry configuration is in `frontend/components.json`. Shikho brand colors are mapped to shadcn's semantic Tailwind tokens in `frontend/src/styles.css`.

## Verify Phase 0

Run the database migration and backend tests serially. Tests share `studycircle_demo` with development and use an outer transaction rollback, so do not run them while manually changing demo data.

```powershell
cd backend
uv run alembic upgrade head
uv run pytest
```

Run frontend tests and the production build:

```powershell
cd frontend
npm test
npm run build
```

Manual acceptance:

1. Create `demo_student` and save the generated key.
2. Enter the protected Phase 0 screen and refresh it.
3. Clear browser site data.
4. Return with the username and saved key.
5. Confirm a wrong key cannot open `/app`.
6. Restart FastAPI and confirm the valid identity still works.

## Demo limitations

- Access keys are stored as plain text and sent in headers. This is intentional for the disposable demo and must not be used as a production authentication design.
- There is no recovery, rotation, expiry, password, JWT, cookie session, OTP, or Shikho account integration.
- Phase 0 contains no circles, learning content, quizzes, scores, notes, or progress data.
- Development and tests use the same database by explicit project decision.
