# Tasks: finance-review-photo-paste

> Phase 1 only — per-card statement photos are Phase 2 (roadmap only, NOT in
> this change).

## 1. Database schema (server/db.js)

- [x] 1.1 Add `images TEXT NOT NULL DEFAULT '[]'` to the
  `CREATE TABLE IF NOT EXISTS monthly_reviews` statement (fresh DBs land in
  the new shape directly).
- [x] 1.2 Add an idempotent migration block mirroring the
  `yearly_goals.images` pattern (~line 246):
  `try { db.exec("ALTER TABLE monthly_reviews ADD COLUMN images TEXT NOT NULL DEFAULT '[]'"); } catch { /* Column already exists */ }`.
  (Bare `catch` instead of `catch (e)` so the block adds zero new `no-unused-vars` errors — lint gate 7.1.)
- [x] 1.3 Sanity check: a fresh `data/app.db` boots; an existing DB boots with
  no error and migrated rows read `images` as `'[]'` (check via a quick
  node/sqlite query).
  — Verified on a copy of the live DB with the column dropped first (`prep-legacy.mjs`):
  boot added the column, all 3 rows read `'[]'`, second boot no-ops.

## 2. Server route (server/routes/monthlyReviews.js)

- [x] 2.1 `deserialize(row)` parses `row.images` (fall back to `[]` on
  parse failure) and includes it in the returned object.
- [x] 2.2 `defaultReview()` returns `images: []`.
- [x] 2.3 `GET /` (list) strips `images` from every row in the response — the
  history payload MUST NOT contain an `images` key.
- [x] 2.4 `GET /current` and `GET /by-month` return `images` (covered by
  deserialize; add an explicit test/assert in smoke).
- [x] 2.5 Add `PATCH /:id/images` — mirror `PATCH /:id/notes`:
  - body `{ images: [...] }`; reject non-array or any non-string element with
    HTTP 400;
  - persist `JSON.stringify(images)`;
  - bump `status` `pending` → `in_progress` when the array is non-empty;
  - return the deserialized updated review; 404 when `id` is missing.
- [x] 2.6 Confirm `PUT /` and `persistReview()` do NOT write the `images`
  column (full-upsert path preserves photos saved via PATCH).

## 3. Client service (src/api.js)

- [x] 3.1 Add `updateImages(id, images)` to `monthlyReviewService` →
  `PATCH /api/monthly-reviews/${id}/images` with body `{ images }`.

## 4. UI — Photos section (src/components/MonthlyReview.jsx)

- [x] 4.1 Load `review.images` into local state when a review loads (default
  `[]`).
- [x] 4.2 Render a `<section className="mfr-photos">` between the notes section
  and the reference section, headed "Photos".
- [x] 4.3 Paste zone (editable months only): intercept Ctrl+V using the same
  flow as `RichTextEditor.jsx` `handlePaste` — iterate
  `event.clipboardData.items`, `item.type.startsWith('image/')` →
  `preventDefault` → `FileReader.readAsDataURL` → append to state + persist.
  Before converting, reject `file.size > 8 * 1024 * 1024` with a user-visible
  message (toast/alert) and no state change.
- [x] 4.4 Thumbnail grid + remove: copy the `YearlyGoals.jsx` preview pattern
  (`yearly-goals-images` / `image-preview` / `image-thumb` + remove button).
  Each paste/remove persists via `monthlyReviewService.updateImages(review.id,
  nextImages)`.
- [x] 4.5 Lightbox: same pattern as YearlyGoals — click thumbnail → full-size
  overlay; Escape closes it.
- [x] 4.6 Read-only months (past months): paste zone and remove buttons hidden;
  thumbnails + lightbox still available.
- [x] 4.7 Accessibility: paste zone has an accessible label/title ("Paste a
  photo (Ctrl+V)"); thumbnails have descriptive alt text.

## 5. CSS (src/components/MonthlyReview.css)

- [x] 5.1 `.mfr-photos` container consistent with existing section styling.
- [x] 5.2 Paste zone style (dashed-border hint area, `.mfr-photos-paste`) with
  hover/focus states.
- [x] 5.3 Thumbnail grid + remove-button styling, reusing the visual language
  of `yearly-goals-image-preview`.
- [x] 5.4 Lightbox overlay styling (dark backdrop, centered image, close
  affordance), aligned with any existing lightbox CSS.

## 6. Tests (src/__tests__/MonthlyReview.test.jsx)

- [x] 6.1 Pasting an image (simulated `clipboardData.items` with an `image/*`
  File) adds a thumbnail and calls `monthlyReviewService.updateImages`.
- [x] 6.2 Removing an image calls `updateImages` with the remaining array.
- [x] 6.3 Oversized paste (> 8 MB mocked `File.size`) is rejected with a
  visible message and no thumbnail is added.
- [x] 6.4 Read-only month: paste zone and remove buttons absent; thumbnails
  render and the lightbox opens on click.
- [x] 6.5 Review from a past month with `images` renders thumbnails.
- [x] 6.6 Service level: `updateImages` issues
  `PATCH /api/monthly-reviews/:id/images` with `{ images }`.
- [x] 6.7 No regressions: existing notes/checklist/card-entry tests still pass.

## 7. Verification

- [x] 7.1 `npm run lint` — no new errors introduced (pre-existing errors stay
  out of scope).
  — Measured per-file vs the HEAD blob: `server/db.js` + `server/routes/monthlyReviews.js`
  at HEAD = 12 errors; after this change the two files carry 14, and both extra
  errors live in the *uncommitted Weekly-Review WIP hunks* of `db.js` (lines 322/358),
  not in this change's code. `monthlyReviews.js` went 0 → 0; `src/api.js`,
  `MonthlyReview.jsx`, both test files: 0 → 0.
- [x] 7.2 `npm run test:run` — all existing + new tests pass.
  — vitest run: 341 tests, 340 passed; the only failing test file is
  `MiniWeekBar.test.jsx` (1 pre-existing failure) plus 2 pre-existing
  `not relevant/CodeNomad` suite load errors — all 3 reproduce on a clean tree.
  New: `MonthlyReview.test.jsx` 29/29, `monthlyReviewService.test.js` 2/2.
- [x] 7.3 Manual smoke (server has no test infra in repo — use curl):
  1. Open Finance view on the current month → Photos section shows the paste
     zone.
  2. Copy a screenshot (Ctrl+C) and Ctrl+V into the paste zone → thumbnail
     appears; network log shows `PATCH /api/monthly-reviews/<id>/images`.
  3. Reload the page → photos persist.
  4. Click a thumbnail → lightbox opens; Escape closes it.
  5. Remove a photo → thumbnail disappears; reload confirms it is gone.
  6. Paste a > 8 MB file → error message shown, no thumbnail.
  7. Open a past month → paste zone/remove hidden; photos still viewable and
     enlargeable.
  8. `curl GET /api/monthly-reviews` — no `images` key in the list payload;
     `curl GET /api/monthly-reviews/current` and `.../by-month?monthKey=YYYY-MM`
     include `images`.
  — Steps 1/2/4/5/6/7 covered by the jsdom component tests (6.1–6.5);
    step 3 + step 8 verified live via the isolated smoke harness
    (`dist/smoke-79e8/smoke.mjs`, 23/23 assertions, plus 3/3 restart-persistence
    assertions after a real server restart against a copy of the live DB —
    the live server/db on :3001 was never touched).

## 8. Coordination

- [x] 8.1 WIP discipline: the uncommitted Weekly Review WORK-toggle changes
  (WeeklyReview/WeeklyObjectives family) are out of scope — do not touch those
  files in this change.
  — Respected: `server/db.js` + `src/api.js` were staged hunk-by-hunk (only this
  change's hunks); the Weekly* files remain untouched and uncommitted.
- [x] 8.2 Before completion, confirm with the reviewer whether
  `openspec/changes/monthly-financial-review` is archived first so the merged
  `monthly-financial-review` canonical spec stays coherent.
  — Handed to the review task (t_0f402102) as an explicit open question; archive
  itself is a human-gated step, not part of this build task.
  — Resolved via t_0f402102 (reviewer) + t_136e3ba4 (probes; mfr→frpp order verified, merged spec coherent).
