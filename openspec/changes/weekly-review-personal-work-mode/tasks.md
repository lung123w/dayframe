# Tasks: weekly-review-personal-work-mode

> Phase 1 only — habit-mode tagging is Phase 2 (roadmap only).

## 1. Database schema (server/db.js)

- [ ] 1.1 Add `mode TEXT NOT NULL DEFAULT 'personal'` to the
  `weekly_objectives` table CREATE statement and rebuild it as
  `UNIQUE(weekStart, mode)`. Use the rebuild pattern documented in
  `design.md` §2 (create `*_new`, copy rows with literal
  `'personal'`, drop, rename) inside a single transaction.
- [ ] 1.2 Add the same `mode` column + rebuild for the `weekly_reviews`
  table. Default backfill is `'personal'` for every existing row.
- [ ] 1.3 Wrap both rebuild blocks in try/catch that ignores
  "already migrated" errors so re-runs are no-ops.
- [ ] 1.4 Add `CHECK(mode IN ('personal','work'))` to both new table
  shapes.
- [ ] 1.5 Sanity check: after a fresh `data/app.db` is created and the
  server boots, `SELECT COUNT(*) FROM weekly_reviews` matches the
  pre-migration count (7 expected) and `SELECT DISTINCT mode` returns
  `'personal'`. Same for `weekly_objectives` (15 expected).

## 2. API — weekly-reviews (server/routes/weeklyReviews.js)

- [ ] 2.1 `GET /` accepts `?mode=` (default `'personal'`) and queries
  with `WHERE weekStart = ? AND mode = ?`.
- [ ] 2.2 `GET /` (no `weekStart`) returns the latest 12 rows for all
  modes with `mode` in each payload.
- [ ] 2.3 `PUT /` accepts `mode` in the body; defaults to `'personal'`
  when absent. INSERT/UPDATE statements reference `mode` in addition
  to `weekStart`. Reject payloads with an invalid `mode` (HTTP 400).
- [ ] 2.4 Default doc factory `DEFAULT_DOC(weekStart, mode)` includes
  `mode` in the returned object.

## 3. API — weekly-objectives (server/routes/weeklyObjectives.js)

- [ ] 3.1 Same `?mode=` semantics as §2.
- [ ] 3.2 `PUT` carries `mode` (default `'personal'`); same 400 on
  invalid value.
- [ ] 3.3 GET-default (missing week) response includes `mode`.

## 4. Client service objects (src/api.js)

- [ ] 4.1 `weeklyReviewService.getByWeek(weekStart, mode = 'personal')`
  appends `&mode=` only when the caller passes a non-default mode.
- [ ] 4.2 `weeklyReviewService.upsert(weekStart, document, mode =
  'personal')` includes `mode` in the PUT body when non-default.
- [ ] 4.3 `weeklyObjectiveService.getByWeek(weekStart, mode =
  'personal')` and `upsert(weekStart, objectives, mode = 'personal')`
  — same shape as §4.1/§4.2.

## 5. UI — WeeklyReview (src/components/WeeklyReview.jsx)

- [ ] 5.1 Add `mode` state (`useState`), initialized from
  `localStorage.getItem('wr.mode') || 'personal'`. Write back to
  `localStorage` on every change.
- [ ] 5.2 Render a segmented control (Personal | Work) inside the
  existing `.wr-week-nav` row, right-aligned. Visually highlight the
  active segment.
- [ ] 5.3 Plumb `mode` through `loadWeek` (passes to
  `weeklyReviewService.getByWeek`) and `save` (passes to
  `weeklyReviewService.upsert`).
- [ ] 5.4 Plumb `mode` through `syncGoals`: write the per-mode
  `weekly_objectives` row via `weeklyObjectiveService.upsert(week,
  objectives, mode)`. The "replace existing objectives" confirm copy
  mentions the active mode.
- [ ] 5.5 When the active mode changes, reload the week document for
  the new mode (no need to also reset `weekStartDate`).
- [ ] 5.6 Reflect the active mode somewhere obvious (e.g. the
  segmented control + the week range label suffix `(Personal)` /
  `(Work)`).

## 6. UI — WeeklyObjectives (src/components/WeeklyObjectives.jsx)

- [ ] 6.1 On mount, read `localStorage['wr.mode']` (default
  `'personal'`) and pass it to `weeklyObjectiveService.getByWeek` /
  `upsert`.
- [ ] 6.2 Listen for `storage` events so a mode change in the Review
  tab is picked up live (best-effort; the planner may not always be
  visible alongside).
- [ ] 6.3 Local mode state still drives save calls; debounce not
  required (existing save is fire-and-forget per click).

## 7. CSS

- [ ] 7.1 `.wr-mode-segmented` and `.wr-mode-segmented__btn` rules in
  `src/components/WeeklyReview.css` matching the app's existing
  segmented-control style (use the existing
  `.habit-mode-toggle` or `.wr-week-nav` patterns as a visual
  reference).
- [ ] 7.2 Active segment uses the same accent color as the active
  sidebar nav item.

## 8. Tests

- [ ] 8.1 Extend `src/__tests__/WeeklyReview.test.jsx`:
  - segmented control renders and highlights the active mode,
  - clicking Work triggers a `getByWeek(weekStart, 'work')` call and
    `upsert(weekStart, ..., 'work')` on save,
  - default mode is `'personal'` and reads from
    `localStorage['wr.mode']`,
  - `syncGoals` calls `weeklyObjectiveService.upsert(weekStart,
    objectives, <activeMode>)`.
- [ ] 8.2 Extend `src/__tests__/WeeklyObjectives.test.jsx`:
  - reads `wr.mode` from localStorage on mount,
  - passes the active mode to `getByWeek` and `upsert`.
- [ ] 8.3 Add `src/__tests__/wrModeStorage.test.jsx` (small): reads
  default `'personal'`, writes on change, survives a "reload" by
  re-reading `localStorage`.

## 9. Verification

- [ ] 9.1 `npm run lint` — no new errors introduced (pre-existing
  errors stay out of scope).
- [ ] 9.2 `npm run test:run` — all existing + new tests pass.
- [ ] 9.3 Manual smoke:
  1. Open Review tab on current week → defaults to Personal.
  2. Toggle Work → request log shows `?mode=work`.
  3. Add a cleanup task in Work mode → PUT body includes `mode:'work'`.
  4. Switch back to Personal → the original personal tasks are
     untouched.
  5. Switch to a past week, Personal → previous personal data shows;
     switch to Work → empty work doc.
  6. Click "Write weekly goals to DayFrame" on Work mode → the
     DailyPlanner's WeeklyObjectives for that week shows only the Work
     objectives, not the Personal ones.
  7. Reload — selected mode is remembered.

## 10. Coordination

- [ ] 10.1 **Before starting implementation**: verify whether
  `fix/weekly-review-habit-hours` (kanban `t_93d76dc1`) has been
  merged into `master`. If not, rebase or wait. The uncommitted
  changes touch the same `WeeklyReview.jsx` + its test.