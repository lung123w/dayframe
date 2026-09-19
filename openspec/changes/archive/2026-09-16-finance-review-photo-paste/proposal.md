## Why

The Monthly Financial Review view (`src/components/MonthlyReview.jsx`) lets the
user work through the monthly checklist, the per-card Payment Tracking table,
and the free-text notes — but it has no way to attach visual evidence. Every
month the user collects receipts, bank/credit-card statements, and
payment-proof screenshots that belong with that month's review (e.g. MoneyPro /
PPS confirmations). Today those images live only in OneDrive or the clipboard,
disconnected from the review they document.

The exploration & decision doc
(`docs/plans/2026-09-13-finance-review-photo-paste.md`) compared three options:

- **Option A — clipboard paste → base64 stored in SQLite** (recommended): zero
  new infra, matches the in-app pattern already shipped twice (`YearlyGoals`
  images, `TaskModal` descriptionImages), and is backup-safe by construction
  (the daily SQLite backup already covers the whole DB).
- **Option B — server file uploads** (`uploads/` + Multer + `express.static`):
  conventional for web apps, but introduces a new dependency + file lifecycle
  for a local single-user app, and would NOT be covered by the existing DB
  backup without extending the backup script.
- **Option C — links only**: does not satisfy the request (a copied screenshot
  cannot become a link).

Anderson approved **Option A + Phase 1 scope on 2026-09-13**. This proposal
turns that decision into an OpenSpec change.

**Why a new change and not an extension of `monthly-financial-review`:** that
change is 96/99 tasks complete — the feature is already shipped and its
remaining rows are verification clean-up; it is simply not archived yet (human
gate). Photo-paste is a distinct follow-up feature with its own approved scope
and review cycle. Re-opening `monthly-financial-review` would mix an
almost-ready-to-archive change with new scope, bloating the archive review.
This change therefore stands alone, and its spec delta targets the same
`monthly-financial-review` capability (ADDED requirements) so the merged
canonical spec stays coherent. Archive note: `monthly-financial-review` should
be archived before (or alongside) this one.

## What Changes

- **Data model** (`server/db.js`)
  - `monthly_reviews` gains `images TEXT NOT NULL DEFAULT '[]'` — a JSON array
    of base64 data-URL strings (one photo per element), mirroring
    `yearly_goals.images` exactly.
  - The `CREATE TABLE IF NOT EXISTS monthly_reviews` statement includes the new
    column for fresh DBs; an idempotent `try { ALTER TABLE ... } catch`
    migration block (same style as db.js ~line 246) adds it to existing DBs.

- **API** (`server/routes/monthlyReviews.js`)
  - `deserialize()` parses `images`; `defaultReview()` returns `images: []`.
  - `GET /api/monthly-reviews` (list / history sidebar) strips `images` from
    every row so the history payload stays small — the sidebar only needs
    monthKey/status.
  - `GET /api/monthly-reviews/current` and `/by-month` include `images`
    (single-review detail paths).
  - New `PATCH /:id/images` — body `{ images: [...] }`; validates it is an array
    of strings; persists as JSON; bumps `status` `pending` → `in_progress` when
    non-empty (mirrors `PATCH /:id/notes`).
  - `PUT /` (full upsert) is intentionally untouched — its SQL never writes the
    `images` column, so a full save preserves photos that were saved via PATCH.

- **Client service** (`src/api.js`)
  - `monthlyReviewService.updateImages(id, images)` →
    `PATCH /api/monthly-reviews/:id/images`.

- **UI** (`src/components/MonthlyReview.jsx` + `MonthlyReview.css`)
  - New **Photos** section between "Other To-Do / Notes" and "Reference".
  - Paste zone reusing the `RichTextEditor` `handlePaste` clipboard pattern
    (intercept `image/*` items on Ctrl+V → `FileReader` → base64 data URL) and
    the `YearlyGoals` presentation pattern (thumbnail grid, remove button,
    click-to-enlarge lightbox).
  - Client-side per-photo cap ≈ 8 MB: larger pastes are rejected with a
    user-visible message and no thumbnail is added.
  - Read-only months (past months): paste zone hidden, remove buttons hidden,
    thumbnails still render and remain enlargeable.

- **Out of scope (Phase 2, roadmap only):** per-card photos inside
  `cardEntries[i]`. Documented in the exploration doc as a natural later
  refinement; the data model stays compatible (JSON array inside an entry).

## Capabilities

### Modified Capabilities

- `monthly-financial-review`: reviews gain a review-level photo gallery —
  `images` JSON column, `PATCH /:id/images`, Photos UI section with
  paste/thumbnail/remove/lightbox. The list endpoint excludes `images`; past
  (read-only) months display photos without editing.

### New Capabilities

(none)

### Roadmap Capabilities (not delivered here)

- `monthly-review-card-photos` (Phase 2): per-card statement photos stored
  inside each `cardEntries[i]`. Not built in this change; the schema keeps the
  door open.

## Impact

- **New files**: `openspec/changes/finance-review-photo-paste/` (this folder).
- **Modified files**:
  - `server/db.js` — CREATE TABLE + migration ALTER for `monthly_reviews.images`.
  - `server/routes/monthlyReviews.js` — deserialize/defaultReview, list strip,
    `PATCH /:id/images`.
  - `src/api.js` — `monthlyReviewService.updateImages`.
  - `src/components/MonthlyReview.jsx` + `MonthlyReview.css` — Photos section.
  - `src/__tests__/MonthlyReview.test.jsx` — new paste/remove/cap/read-only cases.
- **Spec deltas**: `specs/monthly-financial-review/spec.md` — ADDED
  photo-gallery requirements (see file).
- **No new npm packages.** Reuses React, better-sqlite3, Express; the server
  JSON limit is already `50mb` (server/index.js:25).
- **Storage/backup**: each photo adds ~0.5–5 MB to the SQLite DB (base64). The
  existing daily DB backup (OneDrive\3. Resources\Dayframe backup) covers
  photos automatically — nothing new to back up.
- **Backward compatibility**: existing clients and tests keep working; the list
  endpoint's shape is unchanged (the new column is simply absent from its
  payload); `/current` and `/by-month` add one field. Existing `notes`,
  checklist, and card-entry flows are untouched.

## Open coordination note (do NOT silently bury)

- The uncommitted Weekly Review WORK-toggle WIP (WeeklyReview/WeeklyObjectives
  family) touches only WeeklyReview-family files — `MonthlyReview.jsx` and
  `server/routes/monthlyReviews.js` are clean at the current commit. The
  implementer must not pull unrelated WIP into this change.
- `openspec/changes/monthly-financial-review` is still active (96/99 tasks,
  unarchived, human gate). This change extends its capability spec; archive
  `monthly-financial-review` before (or alongside) this change so merged specs
  stay coherent.