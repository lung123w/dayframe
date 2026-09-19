# Design — Weekly Review Habit Panel Shows the Previous Week (Option B)

## 1. Why offset-by-one, not the alternatives

The review flow's mental model is "review last week + plan next week" while
the doc key follows the **plan week** (verified across all existing docs in
`data/app.db`: doc `2026-09-14` was written 2026-09-13 04:16 with goals for
Sep 14–20 and a reflection about Sep 7–13 — the same shape repeats for the
prior two weeks). Three candidate fixes were compared in
`docs/plans/2026-09-13-weekly-review-habit-week.md`:

- **A — change the default week** (`weekStart = startOfWeek(now - 7)`):
  on a Sunday session this lands two weeks before the plan week and loads
  the wrong doc; a weekend-only variant is a UX nicety, not a fix, and
  mid-week sessions would be wrong. **Rejected.**
- **B — habit panel always shows weekStart − 1 (this proposal)**: the doc
  keeps its plan-week anchor while the habit summary — which answers
  reflection content about the *previous* week — follows the review week.
  Purely additive frontend change. **Approved.**
- **C — Review/Plan dual anchors**: the honest long-term shape, but it adds
  state, double fetches, and sync-target decisions, and it collides with the
  uncommitted WORK-toggle WIP (mode state / loadWeek / save in the same
  component). **Deferred until the WIP lands.**

## 2. Anchor semantics and the exact range

- Selected week W (Monday–Sunday, `weekStartsOn: 1`) remains the **plan
  week** anchor for: review doc key, weekly goals, `syncGoals`, key events
  grid, and the default week selection. None of that changes.
- **Review week = W − 1 week.** Concretely, next to the existing derived
  values (`weekStartStr`, `weekEndStr`, `weekRangeLabel`), add:

  ```js
  const reviewWeekStart = subWeeks(weekStartDate, 1);
  const reviewWeekEnd   = subWeeks(weekEnd, 1); // weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 })
  const reviewWeekStartStr = format(reviewWeekStart, 'yyyy-MM-dd');
  const reviewWeekEndStr   = format(reviewWeekEnd, 'yyyy-MM-dd');
  ```

  `loadWeek` then fetches `habitEntryService.getAll({ from:
  reviewWeekStartStr, to: reviewWeekEndStr })`. The review-doc fetch,
  goals, and everything else keep using the selected week.

- **Consistency with the default-week heuristic.** The default is
  "the week containing yesterday", so on a Sunday morning session the
  default selected week is the current (ending) week — and the habit panel
  correctly shows the week that just ended, which is exactly what the
  loaded doc's reflection is about. After clicking Next to the plan week,
  the panel shifts to the week being reviewed. Every existing review doc in
  the DB becomes consistent with this rule; no historical data changes.

- **Edge cases**: a review week with no entries renders the 0m / 0 reps
  chips exactly as today, but with a label that makes the range explicit;
  `subWeeks` is calendar-safe (DST/leap boundaries handled by date-fns);
  navigating to the earliest loaded week simply shows its (possibly empty)
  preceding week, which is harmless.

## 3. Label design — make the range unmissable

The complaint was partly that the title claimed the wrong week. The chips
title must therefore **mark the week as 上週 and print its exact range**:

```
上週習慣 (Review week: Sep 12 – Sep 18):
```

- `reviewWeekRangeLabel = \`${format(reviewWeekStart, 'MMM d')} –
  ${format(reviewWeekEnd, 'MMM d, yyyy')}\`` — a **new variable**; the
  existing `weekRangeLabel` (which the WIP extends with `(modeLabel)`) is
  left untouched and keeps serving the nav row at L600.
- Deliberately **no mode suffix** in the chips title: the nav row already
  carries the mode marker, and copying it into the chip title would double
  it. Additivity beats symmetry here.
- The chip tooltip's `for week of ${weekRangeLabel}` becomes `for review
  week of ${reviewWeekRangeLabel}` so the per-chip data range is truthful
  too.

## 4. What this change deliberately does NOT touch

- Default week heuristic (L293–295), doc load/save, goals, `syncGoals`,
  key events grid, `weekRangeLabel`, mode state / segmented control,
  `server/routes/*`, `server/db.js`, `src/api.js`, `WeeklyObjectives.jsx`,
  CSS, habit tracking semantics. If an implementation diff touches any of
  these, it is out of scope.

## 5. WIP (WORK-toggle) coordination — the only real constraint

The uncommitted WIP already edited `loadWeek` (mode param, `getByWeek`
call) and the chips title area (uses the WIP-extended `weekRangeLabel`).
This change stays additive:

| Touch point | WIP state | This change adds |
|---|---|---|
| `loadWeek` habit fetch (~L357) | `getAll({ from: weekStart, to: weekEndStr })` (mode-aware loadWeek) | offset variables + review-range args |
| Chips title (~L759) / tooltip (~L765) | uses `weekRangeLabel` (with `modeLabel`) | new `reviewWeekRangeLabel`, new title text |

Because we only **add** new variables and change two argument/list
expressions, the implementation can proceed on the WIP working tree without
reverting any WIP edit. Order of operations: if the WIP has not landed,
implement on top of it (rebase the branch onto the WIP state); never start
from `HEAD`.

## 6. Testing strategy

- Update, on the WIP version of `src/__tests__/WeeklyReview.test.jsx`:
  1. the habit-fetch-range assertion currently expecting
     `{ from: expectedDefault, to: expectedDefaultEnd }` now expects the
     `subWeeks`-offset range (`expectedReviewFrom` / `expectedReviewTo`);
  2. the "labels the habit summary..." test — seed entries **inside the
     review week** and assert the title contains 上週習慣 and the review
     week range (the old assertion merely checked the absence of
     "Last week's habits:").
- New small case (cheap): navigating to a different week shifts the habit
  fetch range by the same −1-week offset (prevents regression to the
  selected-week conflation).
- Manual smoke: open Review on the default week — chips say 上週習慣
  (Review week: …) and show the previous week's data; click Next (plan
  week) — chips shift to the week just reviewed; doc/goals still key to the
  selected week.