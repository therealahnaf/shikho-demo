# Phase 2 — Simulated Progress and Leaderboard

## Outcome

A circle member can open the current checkpoint, complete a minimal lesson/quiz/review/challenge simulation, and immediately see a consistent roadmap position, personal score, rank, daily quest, monthly mission, streak, and activity feed.

The value of this phase is the community-state transition. The activity screen itself should take seconds, not attempt to teach or assess content.

## Dependencies

- Phase 1 dashboard, active roadmap, membership, mission, and quest exist.

## In scope

- Full weekly roadmap and leaderboard screens.
- Current, complete, and locked checkpoint states.
- One reusable simulated activity screen.
- Atomic completion transaction and duplicate-completion protection.
- Ranking and personal contribution updates.
- Server-generated activity events.
- Quest completion and one-time streak increment.

## Not in scope

- Real video, lesson content, question banks, answer scoring, timers, explanations, or report cards.
- Attempts, retries, partial progress, adaptive learning, or content authoring.
- WebSockets or live presence.
- Weekly Mentor assignment or reset; those arrive in Phase 4.

## Simulation behavior

Every checkpoint opens the same compact simulation with type-specific copy:

| Type | Simulation |
| --- | --- |
| `review` | Read a two-sentence placeholder and select `Mark review complete`. |
| `lesson` | Show a static illustration/placeholder and select `Finish simulated lesson`. |
| `quiz` | Select any answer to one clearly labelled sample question, then select `Complete simulation`; correctness is not recorded. |
| `challenge` | Show a confirmation checklist and select `Complete weekly challenge`. |

No simulated activity should take more than two actions to complete. Label the page `Demo simulation — no real lesson or score`.

## Scoring and progress rules

Keep the model deterministic and easy to explain:

- Each first-time checkpoint completion adds 30 weekly points.
- Each completion adds 1 to the student's contribution.
- Each completion adds 1 to the active monthly mission and current daily quest, capped at their targets.
- The member's `roadmap_position` advances by one.
- Checkpoints must be completed in order; later checkpoints remain locked.
- When daily quest progress first reaches its target, set `completed_at`, increment the circle streak once, and create a quest-complete event.
- Ranking orders by `weekly_points DESC`, then `joined_at ASC`, then `user_id ASC` for deterministic ties.
- A score change can change the visible leader, but does not assign the Mentor until the Phase 4 finalize action.

The service returns authoritative updated aggregates. The client does not optimistically invent totals or ranks.

## Frontend implementation

### Routes

| Route | Purpose |
| --- | --- |
| `/app/study-circle/:circleId/roadmap` | Full roadmap and member positions. |
| `/app/study-circle/:circleId/activity/:checkpointId` | Minimal simulation. |
| `/app/study-circle/:circleId/leaderboard` | Full weekly ranking. |

### Components

- `RoadmapTrack`: ordered checkpoint nodes with complete/current/locked labels.
- `MemberPositionGroup`: accessible avatar grouping at a checkpoint.
- `SimulatedActivity`: type-specific placeholder with a single completion mutation.
- `CompletionSummary`: changed points, rank, mission, quest, streak, and next checkpoint.
- `LeaderboardTable`: rank, name, avatar, points, Mentor badge, and current-student highlight.
- `ActivityFeedItem`: renders only a known server event type; it never accepts user-authored HTML.

Use buttons as buttons, not clickable cards. After completion, move focus to the summary heading and provide clear next actions: `Back to Circle` and `Continue Roadmap`.

## Backend data model

### `activity_completions`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `circle_id` | UUID | Required. |
| `weekly_cycle_id` | UUID | Required. |
| `roadmap_checkpoint_id` | UUID | Required. |
| `user_id` | UUID | Required. |
| `activity_type` | varchar | Snapshot of checkpoint type. |
| `points_awarded` | integer | Exactly 30 in V1. |
| `completed_at` | timestamptz | Server timestamp. |

Add unique `(weekly_cycle_id, roadmap_checkpoint_id, user_id)`.

### `activity_events`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `circle_id` | UUID | Required and indexed with `created_at`. |
| `actor_user_id` | UUID | Nullable for system events. |
| `event_type` | varchar | Validated known type. |
| `payload` | jsonb | IDs and display snapshots required for rendering. |
| `created_at` | timestamptz | Server timestamp. |

Initial event types: `checkpoint_completed`, `rank_changed`, `daily_quest_completed`, and `streak_increased`. Do not store rendered prose; the frontend maps event types to safe templates.

## API

### `GET /api/v1/circles/{circle_id}/roadmap`

Returns active roadmap, ordered checkpoints, current member position, and compact positions for all members.

### `GET /api/v1/circles/{circle_id}/leaderboard`

Returns the full deterministic ranking, current student rank, current Mentor, and cycle date range.

### `GET /api/v1/circles/{circle_id}/activity-feed?limit=20`

Returns newest-first typed events with a hard maximum of 50.

### `POST /api/v1/circles/{circle_id}/checkpoints/{checkpoint_id}/complete`

The service must:

1. Verify membership and that the checkpoint belongs to the active roadmap.
2. Lock the membership, mission, quest, and circle-state rows needed by the calculation.
3. Verify the checkpoint is the member's current unlocked position.
4. Insert the unique completion.
5. Advance position, add points and contribution, and cap shared progress.
6. Complete the quest/increment streak only on the threshold transition.
7. Compare rank before and after and add only meaningful typed events.
8. Commit once and return a completion summary plus updated dashboard slices.

If already completed, return `409 checkpoint_already_completed`. If out of order, return `409 checkpoint_locked`. The frontend treats either as a cue to refetch authoritative state.

## Concurrency and consistency tests

PostgreSQL integration tests are required here. Unit tests alone are insufficient.

- Two simultaneous completions for the same user/checkpoint award points once.
- Two different students completing concurrently do not lose mission or quest increments.
- Two completions crossing the quest threshold increment the streak once.
- Mission and quest values never exceed their targets.
- A failed event insert rolls back the completion and all aggregate changes.
- Ranking ties always resolve the same way.

## Frontend tests

- Only the current checkpoint is actionable.
- Every simulation type displays the explicit demo label.
- Double-clicking completion sends one active request.
- Completion summary renders server-returned deltas.
- A duplicate/locked response refetches and explains the state without corrupting UI.
- Dashboard, roadmap, leaderboard, and feed show the new state after navigation and refresh.

## Manual test gate

1. Record the student's roadmap position, points, rank, contribution, mission, quest, and streak.
2. Complete the current simulated checkpoint.
3. Verify position +1, points +30, contribution +1, mission +1, and quest +1.
4. Verify rank is recalculated and a completion event is visible.
5. Refresh every affected screen and confirm the same values.
6. Replay the completion request and confirm it awards nothing.
7. Complete enough checkpoints to cross the daily target and verify the streak changes only once.

## Exit criteria

- The full progress transaction is atomic and concurrency-tested in PostgreSQL.
- Reviewers cannot mistake the simulation for real course content.
- No Mentor selection, roadmap editing, or note feature has been introduced early.
