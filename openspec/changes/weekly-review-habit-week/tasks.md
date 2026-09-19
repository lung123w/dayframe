# Tasks: weekly-review-habit-week

## 1. WeeklyReview.jsx — derive the review-week range

- [ ] 1.1 Next to the existing derived values (`weekStartStr`,
  `weekEndStr`, `weekRangeLabel`, ~L326–330), add:
  `reviewWeekStart = subWeeks(weekStartDate, 1)` and
  `reviewWeekEnd = subWeeks(weekEnd, 1)`; then
  `reviewWeekStartStr` / `reviewWeekEndStr` (`yyyy-MM-dd`) and
  `reviewWeekRangeLabel` (`MMM d – MMM d, yyyy`, **no** mode suffix).
  `subWeeks` comes from date-fns (already imported).
- [ ] 1.2 In `loadWeek` (~L357) change the habit fetch to
  `habitEntryService.getAll({ from: reviewWeekStartStr, to:
  reviewWeekEndStr })`. The review-doc fetch, goals, sync, and key events
  keep using the selected week.

## 2. WeeklyReview.jsx — habit summary labels

- [ ] 2.1 Chips title (~L759): replace `Habits ({weekRangeLabel}):` with
  `上週習慣 (Review week: {reviewWeekRangeLabel}):` — do NOT rename or
  repurpose the existing `weekRangeLabel` (the nav row still uses it).
- [ ] 2.2 Chip tooltip (~L765): `for week of ${weekRangeLabel}` becomes
  `for review week of ${reviewWeekRangeLabel}`.

## 3. Tests — lay on the WIP version of WeeklyReview.test.jsx

- [ ] 3.1 Update the habit-fetch-range assertion (currently
  `expect(mockHabitEntryGetAll).toHaveBeenCalledWith({ from:
  expectedDefault, to: expectedDefaultEnd })`): compute
  `expectedReviewFrom` / `expectedReviewTo` with the same `subWeeks`
  offset and assert those. Seed the mock entries inside the review week.
- [ ] 3.2 Rewrite the "labels the habit summary with the actual data range
  instead of 'Last week'" test: seed entries dated in the review week and
  assert the title contains 上週習慣 and the review-week range (e.g.
  `Review week:`). The current "no 'Last week's habits:' text" assertion is
  no longer sufficient on its own.
- [ ] 3.3 Add one small case: when a different week is selected, the habit
  fetch range shifts by the same −1-week offset (guards against regressing
  to the selected-week conflation).

## 4. Verification

- [ ] 4.1 `npm run lint` — no new errors (pre-existing errors stay out of
  scope).
- [ ] 4.2 `npm run test:run` — all existing + new tests pass.
- [ ] 4.3 Manual smoke:
  1. Open the Review tab on the default week → chips title reads
     `上週習慣 (Review week: …)` and the chips show the previous week's
     data (not the selected week's).
  2. Click Next (plan week) → chips shift to the week just reviewed; the
     doc, goals, and sync still target the selected (plan) week.
  3. Click Previous twice → chips stay one week behind the selected week
     each time.

## 5. Coordination (do BEFORE starting code)

- [ ] 5.1 Verify whether the WORK-toggle Phase 1 WIP (kanban `t_0e736d8f`)
  has landed on `master`. If not, implement on top of the WIP working
  tree / rebase onto it — **never start from `HEAD`** (the diff would
  collide on `WeeklyReview.jsx` + its test file).
- [ ] 5.2 Confirm `src/__tests__/WeeklyReview.test.jsx` is the WIP version
  (+114 lines) before editing §3.
- [ ] 5.3 Scope guard: the implementation must NOT touch `server/` routes,
  `server/db.js`, `src/api.js`, `WeeklyObjectives.jsx`, CSS, or the mode
  logic. If a diff needs any of those, stop and flag.