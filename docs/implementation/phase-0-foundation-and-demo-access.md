# Phase 0 — Foundation and Demo Access

## Outcome

A developer can start React, FastAPI, and PostgreSQL locally. A reviewer can create a demo identity, receive an access key, clear browser state, and return using username plus that key.

This phase does not expose StudyCircle features yet. It establishes a small, explicit boundary between identity metadata and the later community domain.

## Dependencies

None. Follow the shared decisions in [`00-implementation-roadmap.md`](00-implementation-roadmap.md).

## In scope

- Frontend and backend scaffolding.
- PostgreSQL, SQLAlchemy, Alembic, and health checks.
- shadcn/ui and brand-token setup.
- Demo identity onboarding and return login.
- Client-side persistence of demo credentials.
- Protected `/me` read.
- Seed command framework and test database setup.

## Not in scope

- Shikho production authentication or existing Shikho accounts.
- Passwords, password recovery, key recovery, OTP, JWT, cookies, or OAuth.
- Circle discovery, joining, dashboard, or progress.

## User flow

### First visit

1. Open the Shikho-style shell.
2. Select `Try StudyCircle Demo`.
3. Complete a form with username, display name, class, curriculum/board, subject, and optional school.
4. Submit the form.
5. See the generated access key in a non-dismissible result card until it is copied or acknowledged.
6. Select `Continue` and enter the authenticated shell.

Class 10 and Mathematics are the only enabled cohort values in this demo. Other values may be shown as disabled future options, but do not create dynamic circles.

### Return visit

1. Select `I already have a key`.
2. Enter username and access key.
3. On successful verification, persist both values and enter the authenticated shell.
4. On failure, show a generic `Username or key is incorrect` error.

### Local session behavior

- Store `demo_username` and `demo_access_key` in `localStorage`.
- On app boot, call `GET /api/v1/me` with both demo headers.
- If verification fails, remove both values and route to demo login.
- `Leave demo` clears local storage only. It does not delete the database row.

## Frontend implementation

### Routes

| Route | Purpose |
| --- | --- |
| `/` | Minimal Shikho-style landing shell and demo entry. |
| `/demo/onboarding` | New demo identity form. |
| `/demo/access-key` | One-time key display after creation. |
| `/demo/login` | Username and access-key form. |
| `/app` | Protected placeholder for Phase 1. |

### Components

- `BrandShell`: mobile-first header, wordmark area, and constrained content.
- `DemoNotice`: states that credentials are disposable and insecure.
- `DemoOnboardingForm`: shadcn/ui `Form`, `Input`, `Select`, and `Button`.
- `AccessKeyCard`: monospace key, `Copy` button, and acknowledgement checkbox.
- `DemoLoginForm`: username/key inputs with inline and root errors.
- `ProtectedRoute`: waits for `/me`, then renders, redirects, or shows an error retry.

Use semantic design tokens from the roadmap rather than raw hex values inside feature components.

## Backend implementation

### Table: `demo_users`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `username` | varchar(30) | Required, lowercase normalized, unique, pattern `[a-z0-9_]+`. |
| `display_name` | varchar(80) | Required. |
| `class_level` | varchar(30) | Required; seed-supported value `class_10`. |
| `curriculum` | varchar(40) | Required; selected from a small configured list. |
| `preferred_subject` | varchar(50) | Required; seed-supported value `mathematics`. |
| `school_name` | varchar(120) | Optional. |
| `access_key` | varchar(20) | Required and unique; plain text by explicit demo decision. |
| `created_at` | timestamptz | Required, server default. |

Normalize usernames before uniqueness checks. Generate keys from an unambiguous uppercase alphabet that excludes `0/O` and `1/I`, using a cryptographically random generator even though the surrounding auth design is not secure.

### API

#### `POST /api/v1/demo-users`

Request:

```json
{
  "username": "demo_student",
  "display_name": "Demo Student",
  "class_level": "class_10",
  "curriculum": "nctb_bangla",
  "preferred_subject": "mathematics",
  "school_name": "Example School"
}
```

Response `201`:

```json
{
  "user": {
    "id": "uuid",
    "username": "demo_student",
    "display_name": "Demo Student",
    "class_level": "class_10",
    "curriculum": "nctb_bangla",
    "preferred_subject": "mathematics",
    "school_name": "Example School"
  },
  "access_key": "SC-A7K9-M2QX"
}
```

Return `409 username_taken` for a duplicate normalized username.

#### `POST /api/v1/demo-sessions/verify`

Accepts `{ "username": "...", "access_key": "..." }` and returns the public user profile. It creates no session record.

#### `GET /api/v1/me`

Requires `X-Demo-Username` and `X-Demo-Access-Key`. Return the public user profile or `401 invalid_demo_access`.

#### `GET /health/live` and `GET /health/ready`

- `live` confirms the process is running.
- `ready` runs a minimal database check.

## Implementation order

1. Add Compose configuration for PostgreSQL and example environment files.
2. Scaffold FastAPI settings, database session lifecycle, error envelope, and health routes.
3. Add SQLAlchemy model and first Alembic migration.
4. Implement key generation, identity creation, header verification dependency, and tests.
5. Scaffold React, Tailwind, shadcn/ui, route handling, and API client.
6. Add brand variables, fonts with Bangla coverage, forms, local credential store, and protected routing.
7. Add a repeatable seed command abstraction, even though community seed data arrives in Phase 1.

## Automated tests

### Backend

- Creates and reads a valid demo user.
- Normalizes username case and whitespace.
- Rejects duplicate usernames and invalid metadata.
- Generates a correctly formatted unique access key.
- Verifies valid credentials and rejects either incorrect header.
- Does not include `access_key` in `/me` or normal profile responses.
- Ready health check fails clearly if PostgreSQL is unavailable.

### Frontend

- Validates required onboarding fields.
- Shows duplicate-username API errors.
- Copies and acknowledges the returned key.
- Restores an authenticated shell after reload.
- Clears invalid stored credentials and routes to login.
- Clears local credentials on `Leave demo`.

## Manual test gate

1. Start from an empty database and run migrations.
2. Open the frontend and create `demo_student`.
3. Save the displayed access key.
4. Refresh and confirm the protected shell remains available.
5. Clear site storage.
6. Log in with `demo_student` and the saved key.
7. Try a wrong key and confirm no protected content renders.

## Exit criteria

- All manual steps pass against PostgreSQL, not an in-memory replacement.
- Backend and frontend automated tests pass.
- The access-key warning is visible in onboarding and login.
- No Circle data model or simulated lesson/quiz behavior has been added early.
