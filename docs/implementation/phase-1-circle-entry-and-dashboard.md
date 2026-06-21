# Phase 1 — Circle Entry and Dashboard

## Outcome

An identified demo student can discover the single recommended Class 10 Mathematics circle, join it once, refresh, and land on a persistent Circle Home populated with shared community state.

This phase is intentionally read-only after joining. Progress cards and roadmap actions may link to a `Coming in the next phase` notice, but must not fake mutations.

## Dependencies

- Phase 0 is complete.
- Demo header verification is available to all `/api/v1` community routes.

## In scope

- Shikho home entry card and StudyCircle introduction.
- One recommended circle based on the student's captured metadata.
- Idempotent join and membership persistence.
- Read-only Circle Home with mission, quest, streak, roadmap preview, leaderboard preview, current Mentor, and feed empty/seed state.
- Deterministic seed data for the circle and five peer members.

## Not in scope

- Multiple recommendations, matching algorithms, invitations, or leaving a circle.
- Activity completion, score changes, notes, helpful reactions, Mentor selection, or roadmap editing.
- Real-time refresh.

## Seed scenario

Use stable fixture identifiers where practical so screenshots and end-to-end selectors remain deterministic.

| Data | Seed value |
| --- | --- |
| Circle | `Math Champions` — Class 10 Mathematics |
| Seed members | Rafi, Nabila, Samia, Fahim, Arif |
| Monthly mission | `Complete 50 roadmap activities together` — 31/50 |
| Daily quest | `Complete 5 roadmap activities today` — 2/5 |
| Circle streak | 7 days |
| Weekly roadmap | Review Algebra Basics; Simulated Lesson; Practice Quiz; Review Mistakes; Weekly Challenge |
| Existing Mentor | Nabila |
| Leader points | Deterministic values with Nabila first |

The reviewer-created student joins with zero weekly points and roadmap position 0. Seed peers are marked as system fixtures and cannot log in.

## User flow

1. Authenticated Shikho-style home shows a StudyCircle card.
2. `Explore StudyCircle` opens an introduction with three benefits.
3. `Find My Circle` returns the one supported recommendation.
4. `Join Circle` creates membership and shows confirmation.
5. `Enter StudyCircle` opens Circle Home.
6. Later visits skip introduction and recommendation when membership exists.

If the student's metadata does not match the supported class/subject due to direct API use, return an explicit no-recommendation state. Do not silently create a circle.

## Frontend implementation

### Routes

| Route | Purpose |
| --- | --- |
| `/app/home` | Shikho-style shell with StudyCircle entry card. |
| `/app/study-circle/intro` | Community value proposition. |
| `/app/study-circle/recommended` | Recommended-circle card and join. |
| `/app/study-circle/joined` | Join confirmation. |
| `/app/study-circle/:circleId` | Circle Home. |

### Circle Home composition

- Header: circle name, cohort, member avatars, Mentor badge.
- Primary action: `Continue Roadmap`, disabled with a Phase 2 explanation.
- `MissionCard`: title, shared `Progress`, percentage, target, student's contribution.
- `DailyQuestCard`: title, progress, completion badge, time remaining derived by backend.
- `StreakCard`: count and short explanation.
- `RoadmapPreview`: five ordered checkpoints and member avatar positions.
- `LeaderboardPreview`: top three plus current student.
- `ActivityFeed`: seeded system events or an accessible empty state.

Use shadcn/ui cards, progress, avatars, badges, skeletons, and alerts. On mobile, the primary action remains near the top; previews become a single column.

## Backend data model

### Community tables

| Table | Key fields |
| --- | --- |
| `circles` | `id`, `name`, `class_level`, `subject`, `description`, `created_at` |
| `circle_memberships` | `circle_id`, `user_id`, `weekly_points`, `roadmap_position`, `personal_contribution`, `joined_at`, unique `(circle_id, user_id)` |
| `missions` | `circle_id`, `title`, `target`, `progress`, `starts_at`, `ends_at`, `status` |
| `daily_quests` | `circle_id`, `local_date`, `title`, `target`, `progress`, `completed_at`, unique `(circle_id, local_date)` |
| `weekly_cycles` | `circle_id`, `week_number`, `starts_at`, `ends_at`, `status`, unique active cycle per circle |
| `roadmaps` | `weekly_cycle_id`, `title`, `status`, `published_at`, `created_by_user_id` nullable for seed |
| `roadmap_checkpoints` | `roadmap_id`, `position`, `title`, `activity_type`, `topic_key`, unique `(roadmap_id, position)` |
| `circle_state` | `circle_id`, `streak_days`, `current_mentor_user_id`, `updated_at` |

Use check constraints for non-negative progress, positions, and points. `activity_type` is an enum-like validated string: `review`, `lesson`, `quiz`, or `challenge`.

The peer members may live in `demo_users` with a `is_seed_fixture` boolean and inaccessible random keys. This keeps memberships and Mentor references structurally identical to the reviewer's membership.

## API

### `GET /api/v1/circles/recommended`

Returns either one matching summary or `data: null` with a reason. It must not join automatically.

### `POST /api/v1/circles/{circle_id}/join`

Creates membership with zero points/contribution and position 0. Repeating the same request returns the existing membership with `200`; first join returns `201`.

### `GET /api/v1/me/circle-membership`

Returns the current membership summary or `null`. The app uses it to skip product onboarding.

### `GET /api/v1/circles/{circle_id}/home`

Returns one page-oriented aggregate containing:

- circle and current student membership;
- current mission and quest;
- streak and current Mentor;
- active roadmap and member positions;
- leaderboard preview;
- latest activity events, initially seeded or empty.

One aggregate endpoint avoids a loading waterfall on the primary demo screen. Detail endpoints arrive only when their screens need them.

## Implementation order

1. Add community migrations and database constraints.
2. Add an idempotent `seed_demo` command for the circle, peers, active periods, scores, and roadmap.
3. Implement recommendation and membership service tests.
4. Implement the home aggregate query and response schema.
5. Build entry, introduction, recommendation, and confirmation routes.
6. Build Circle Home previews and responsive loading/error states.
7. Add membership-aware routing from `/app/home`.

## Automated tests

### Backend

- Returns one recommendation for matching metadata and none for mismatched metadata.
- Creates only one membership under repeated or concurrent joins.
- Returns the existing membership on a repeated join.
- Does not expose a circle home to a non-member.
- Home aggregate has one active mission, quest, cycle, roadmap, and consistent totals.
- Seed command can run twice without duplicate records.

### Frontend

- Shows introduction benefits and recommendation data.
- Handles join success, retryable failure, and repeated join.
- Skips product onboarding for an existing member.
- Renders all required Circle Home sections from the aggregate response.
- Shows useful loading, no-recommendation, and server-error states.
- Disabled roadmap action explains that progress simulation is unavailable in this phase.

## Manual test gate

1. Log in with the Phase 0 demo user.
2. Open StudyCircle, read the introduction, and find `Math Champions`.
3. Join the circle and enter Circle Home.
4. Verify all seven dashboard areas render with seeded data.
5. Refresh and verify the app returns directly to the same Circle Home.
6. Submit the join API again and verify no duplicate member or count increase.

## Exit criteria

- Membership and every displayed aggregate survive refresh and backend restart.
- Only one circle and one active roadmap exist.
- The dashboard contains no functional simulated completion, Store, or Mentor controls yet.
