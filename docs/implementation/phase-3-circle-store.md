# Phase 3 — Circle Store

## Outcome

Circle members can browse shared resources, filter them, add a text note or small image note, and mark another member's note helpful. Notes, reactions, points, and feed events persist after refresh.

`Circle Store` keeps the name from the overview, but nothing is bought or sold.

## Dependencies

- Phase 2 typed feed events and membership points exist.

## In scope

- Notes list and detail views.
- Fixed chapter/category filters.
- Text note or small image note creation.
- One helpful reaction per member per note.
- Note-created feed event and a fixed sharing reward.

## Not in scope

- Comments, replies, editing, deletion, reporting, moderation, approval, search, rich text, or downloads.
- Multiple images, PDF/video/audio files, external object storage, antivirus scanning, or image transformation.
- Helpful-reaction point farming.

## Product rules

- Allowed categories are seeded configuration: `chapter_1`, `chapter_2`, `formulas`, `revision_notes`, and `important_questions`.
- A note requires a title, category, and exactly one content mode: text or image.
- Text is plain text, 20–2,000 characters.
- Images are JPEG, PNG, or WebP and at most 2 MB.
- Creating a note awards the author 10 weekly points and creates one `note_created` event.
- Helpful is a toggle represented by a unique reaction row. It awards no points.
- A member cannot mark their own note helpful.
- Notes sort newest first, with an optional category filter.

For this demo, image bytes live in PostgreSQL `bytea`. This is a conscious shortcut that gives restart-safe persistence without introducing an object-storage service. It is not the production recommendation.

## Frontend implementation

### Routes

| Route | Purpose |
| --- | --- |
| `/app/study-circle/:circleId/store` | Notes grid/list and category filters. |
| `/app/study-circle/:circleId/store/new` | Add-note form. |
| `/app/study-circle/:circleId/store/:noteId` | Note detail and helpful action. |

### Components

- `StoreFilters`: shadcn/ui `Tabs` on wide screens and `Select` on narrow screens.
- `NoteCard`: title, category, author, timestamp, type, and helpful count.
- `AddNoteForm`: content-mode choice, title/category fields, text area or file input.
- `ImagePreview`: local preview, file type/size feedback, and remove action.
- `HelpfulButton`: pressed state, count, and pending protection.

Use browser-native file selection styled around shadcn/ui controls. Do not implement drag-and-drop unless it is trivial after all acceptance behavior passes.

## Backend data model

### `notes`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `circle_id` | UUID | Required and indexed with `created_at`. |
| `author_user_id` | UUID | Required. |
| `title` | varchar(120) | Required. |
| `category` | varchar(40) | Validated fixed value. |
| `content_type` | varchar(10) | `text` or `image`. |
| `text_content` | text | Required only for text notes. |
| `image_bytes` | bytea | Required only for image notes. |
| `image_mime_type` | varchar(30) | Required only for image notes. |
| `image_size` | integer | Required only for image notes, max 2 MB. |
| `created_at` | timestamptz | Required. |

Use a check constraint to enforce exactly one valid content mode.

### `note_reactions`

| Column | Type | Rules |
| --- | --- | --- |
| `note_id` | UUID | Required. |
| `user_id` | UUID | Required. |
| `reaction_type` | varchar(20) | Only `helpful` in V1. |
| `created_at` | timestamptz | Required. |

Primary or unique key: `(note_id, user_id, reaction_type)`.

## API

### `GET /api/v1/circles/{circle_id}/notes?category=chapter_1&limit=30`

Returns note summaries, author, helpful count, and `helpful_by_me`. It never returns image bytes in the collection.

### `POST /api/v1/circles/{circle_id}/notes`

Accept `multipart/form-data` so text and image modes use one endpoint. Validate declared MIME type, recognizable file signature, and byte length. Create the note, add 10 points, recalculate rank, and create `note_created` plus meaningful `rank_changed` events in one transaction.

### `GET /api/v1/circles/{circle_id}/notes/{note_id}`

Returns metadata and text content. For image notes, return an `image_url` to the image endpoint.

### `GET /api/v1/circles/{circle_id}/notes/{note_id}/image`

Streams bytes with the stored supported MIME type, `Content-Disposition: inline`, and conservative cache headers.

### `PUT /api/v1/circles/{circle_id}/notes/{note_id}/helpful`

Creates the unique helpful reaction and returns updated count/state. Repeating the request is idempotent.

### `DELETE /api/v1/circles/{circle_id}/notes/{note_id}/helpful`

Removes the caller's reaction and returns updated count/state. Repeating the request is idempotent.

## Implementation order

1. Add note/reaction migration and constraints.
2. Extend seed data with four representative text notes and one small image fixture.
3. Implement validation, list/detail/image queries, and create transaction.
4. Implement idempotent helpful service.
5. Add store routes, filters, add form, detail, and server-error states.
6. Add feed renderer for `note_created` and invalidate leaderboard after note creation.

## Automated tests

### Backend

- Creates valid text and image notes for members.
- Rejects no content, both content modes, bad category, unsupported MIME, spoofed signature, and oversized image.
- Hides image bytes from list/detail JSON.
- Awards note points and event once if the request is retried after a known success.
- Creates and removes one helpful reaction idempotently.
- Rejects self-reaction and non-member access.
- Filters by every fixed category and orders newest first.

To make note creation retry-safe, accept an `Idempotency-Key` header and store it with a unique `(author_user_id, idempotency_key)` constraint on notes.

### Frontend

- Switches cleanly between text and image mode.
- Validates file type/size before submit while still relying on server validation.
- Shows pending/success/error states without duplicate submit.
- Filters notes and preserves the filter in the URL query string.
- Toggles helpful state and reconciles with the server response.
- Renders image-note failures with accessible fallback content.

## Manual test gate

1. Add a text note in `Formulas` and verify the author gains 10 points and a feed event appears.
2. Refresh and confirm the note remains.
3. Add a valid image note and verify its detail image loads after refresh/backend restart.
4. Log in as a second seeded test identity and mark the first note helpful.
5. Refresh and verify the count and pressed state remain.
6. Filter to `Formulas` and verify unrelated notes disappear.

## Exit criteria

- Note data, image bytes, and reactions persist in PostgreSQL.
- Duplicate submissions/reactions cannot create duplicate rewards or counts.
- There are no comments, moderation, rich editor, or production upload-service dependencies.
