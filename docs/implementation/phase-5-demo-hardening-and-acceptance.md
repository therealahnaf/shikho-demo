# Phase 5 — Demo Hardening and Acceptance

## Outcome

The entire StudyCircle story is repeatable, responsive, accessible enough for a product demo, and covered by a cumulative end-to-end test. A reviewer can reset the scenario and run it again without manual database work.

This phase fixes gaps; it does not add product scope.

## Dependencies

- Phases 0–4 have passed their individual gates.

## In scope

- Deterministic demo reset and seed workflow.
- Complete loading, empty, success, and error handling.
- Mobile/desktop layout, keyboard navigation, and accessible names/status.
- Cross-feature cache invalidation and stale-state review.
- Cumulative Playwright journey.
- Setup/run documentation and demo script.
- Basic performance and persistence checks appropriate for a demo.

## Not in scope

- Production security hardening, autoscaling, observability platform, disaster recovery, CDN, object storage, penetration testing, analytics, or formal WCAG certification.
- New community features, real content, or new user roles.

## Deterministic reset

Provide both:

- CLI: `seed_demo --reset` for development and CI.
- API: `POST /api/v1/demo/reset` enabled only when `DEMO_RESET_ENABLED=true`.

The API requires a typed confirmation payload such as `{ "confirmation": "RESET STUDYCIRCLE" }`. It resets only demo-domain rows, reruns idempotent seed data, and returns the seeded scenario summary. It must never be enabled by default outside the demo environment.

Resetting invalidates existing reviewer-created demo users. The UI clears local credentials after a successful reset and routes to onboarding.

## UX hardening checklist

### Navigation and state

- Back/forward navigation preserves valid route state.
- Direct links handle missing login, missing membership, unauthorized Mentor, missing note, and archived checkpoint.
- All mutations disable repeated submission and show a result.
- TanStack Query invalidates the minimum affected keys after completion, note creation, reaction, finalize, publish, and rollover.
- Refresh on any route reconstructs state from the API.

### Responsive layout

- Verify at 360×800, 768×1024, and 1280×800.
- No horizontal page overflow.
- Roadmap can scroll within a labelled region if it cannot fit.
- Leaderboard converts from table to labelled cards on narrow screens if necessary.
- Primary actions remain visible without covering content.

### Accessibility

- One `h1` per screen and logical heading order.
- Inputs have labels and errors associated with fields.
- Dialog focus is trapped and returns to the trigger.
- Toasts are supplementary; persistent text communicates important results.
- Progress exposes current/max values and adjacent readable text.
- Locked/completed/current states use text or icons in addition to color.
- Up/down reorder controls work by keyboard and announce the resulting order.
- Pink/blue/yellow combinations meet contrast needs; use dark text or dark blue surfaces where required.
- Respect reduced-motion preferences for celebrations and progress transitions.

### Content and demo clarity

- Every lesson/quiz view says `Demo simulation`.
- Every reset/finalize/rollover action says `Demo control`.
- No copy implies real Shikho account access, grades, teacher review, or actual learning completion.
- Use consistent `Circle Store`, `Mentor of the Week`, `Weekly Roadmap`, `Daily Quest`, and `Monthly Mission` terms.

## Failure-state matrix

| Failure | Expected behavior |
| --- | --- |
| API unavailable | Persistent retry panel; no false success. |
| Invalid stored key | Clear local demo credentials and return to login. |
| Duplicate completion | Refetch roadmap and explain it is already complete. |
| Stale locked checkpoint | Refetch and route to current checkpoint. |
| Upload rejected | Keep form values, remove invalid file only when needed, show server reason. |
| Lost Mentor status | Close workspace mutation path and return to Circle Home with explanation. |
| Already finalized/published/rolled over | Return and render existing authoritative result. |
| Missing seeded data | Ready check or page error names the missing demo setup; do not synthesize client data. |

## Cumulative end-to-end test

Run against a migrated PostgreSQL test database and real FastAPI process:

1. Reset the demo.
2. Create a demo identity and capture the key.
3. Clear storage and return with username/key.
4. Open StudyCircle, view introduction, and join the recommendation.
5. Refresh and verify membership/dashboard.
6. Open the roadmap and complete simulated checkpoints.
7. Verify mission, quest, position, score, rank, streak, and feed updates.
8. Add a text note and verify it after refresh.
9. Add an image note and verify image rendering.
10. Use a second test identity to mark the first note helpful.
11. Continue activities until the primary identity is rank one.
12. Finalize the week and verify Mentor access.
13. Build, reorder, and publish the next roadmap with Mentor's Pick.
14. Start the next week.
15. Verify new roadmap, zeroed weekly scores/positions, preserved notes, Mentor badge, and feed.
16. Restart the backend and re-verify persisted state.

Use role/name or stable `data-testid` selectors only where semantic selectors cannot identify repeated product objects. Do not assert fragile CSS class names.

## Performance budget

For the local seeded dataset on a normal developer machine:

- Circle Home API p95 under 500 ms across a short 20-request smoke run.
- Mutations under 800 ms excluding image upload transfer.
- Circle Home should not require more than two initial API requests after identity verification.
- No unbounded query loops; inspect SQL query count for the home aggregate and notes list.

These are regression tripwires, not production service-level objectives.

## Operations and documentation deliverables

- Root README with prerequisites, environment variables, migrate, seed/reset, run, test, and teardown commands.
- `.env.example` for frontend/backend with safe local defaults.
- One-command or clearly ordered local startup using Docker Compose.
- Short `demo-script.md` matching the acceptance journey.
- Known-limitations section that repeats the insecure access-key design and demo-only image storage.
- CI steps for backend tests, frontend tests/build, and Playwright.

## Final manual acceptance

Run the complete journey twice:

1. First at 1280 px using mouse/pointer interaction.
2. Reset.
3. Repeat at 360 px using keyboard wherever supported.
4. Reload after each state-changing feature.
5. Restart the backend before the final verification.

Record any intentional visual difference from the plan. Do not waive a persistence, duplicate-reward, authorization-gate, or transaction failure for demo polish.

## Exit criteria

- All phase tests and the cumulative Playwright journey pass from a clean reset.
- The app can be run by a new developer using committed documentation.
- The reviewer flow satisfies all 19 acceptance outcomes in [`v1-overview.md`](../v1-overview.md).
- Remaining limitations are explicitly listed and do not undermine the community-layer story.
