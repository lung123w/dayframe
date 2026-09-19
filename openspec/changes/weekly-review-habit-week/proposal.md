## Why

DayFrame's Weekly Review flow pairs "plan next week" with "review last week"
in one screen, but the habit summary panel fetches habit entries for the
**selected** week (`WeeklyReview.jsx` `loadWeek` →
`habitEntryService.getAll({ from: weekStart, to: weekEndStr })`).

Anderson's actual usage (verified from `data/app.db` + the exploration doc,
`docs/plans/2026-09-13-weekly-review-habit-week.md`): every Sunday ~04:00 he
opens the Review tab, navigates to the **next** week (the plan week — which
becomes the doc key, the goals target, and the sync anchor), and writes the
reflection about the **previous** week. The habit chips therefore show the
plan week's entries — on the Sunday session those are almost always all 0m /
0 reps — with a title claiming `Habits (Sep 14 – Sep 20):` while the
reflection he is answering asks about the week that just ended.

Root cause (explore-verified): a single week selector conflates the *plan
week* and the *review week*. The doc, goals, sync, and key events correctly
follow the selected (plan) week; only the habit summary incorrectly follows
it too.

The exploration doc compared three options. Anderson approved **Option B**:
the habit summary panel SHALL always show the week *before* the selected
week (review week = selected weekStart − 7 days). Option B was chosen
because it:

- matches the DB-verified pattern — doc key = plan week, review content =
  plan week − 1 — for every existing review document,
- is a purely additive frontend change (two touch points in
  `WeeklyReview.jsx`; zero API / DB / schema / CSS changes),
- has minimal overlap with the uncommitted WORK-toggle WIP
  (kanban `t_0e736d8f`) — new derived variables only, no edits to existing
  lines' semantics.

Rejected: **Option A** (change the default week — on a Sunday session it
loads the wrong doc and still misses the panel); **Option C** (dual
Review/Plan anchors — too heavy, collides with the WIP, deferred until the
WORK-toggle lands).

## What Changes

- **`src/components/WeeklyReview.jsx`** (frontend only)
  - Derive a review-week range next to the existing week range:
    `reviewWeekStart = subWeeks(weekStartDate, 1)`,
    `reviewWeekEnd = subWeeks(weekEnd, 1)`, formatted `yyyy-MM-dd` strings,
    and a `reviewWeekRangeLabel` (plain `MMM d – MMM d, yyyy`; deliberately
    no mode suffix — see `design.md` §3).
  - In `loadWeek`, fetch habit entries for the review-week range:
    `habitEntryService.getAll({ from: reviewWeekStartStr, to:
    reviewWeekEndStr })`. Review-doc fetch, goals, sync, key events, and the
    default week selection are unchanged.
  - Habit summary title becomes 上週-labelled and names the review week,
    e.g. `上週習慣 (Review week: Sep 12 – Sep 18):` (replaces
    `Habits ({weekRangeLabel}):`). The chip tooltip's "for week of …" text
    references the review week range.
  - Existing `weekRangeLabel` variable is left untouched (still used by the
    nav row), so the change stays additive against the WIP.
- **`src/__tests__/WeeklyReview.test.jsx`** — two assertions updated (fetch
  range offset by −1 week; the "labels the habit summary" test now asserts
  the 上週 / Review week label). These edits must be laid on the **WIP
  version** of the test file (see coordination note).
- **No changes** to `server/` routes, `server/db.js`, `src/api.js`,
  `WeeklyObjectives.jsx`, CSS, or any habit-tracking code. No new npm
  packages (uses existing `date-fns` `subWeeks`).

## Capabilities

### Modified Capabilities

- `weekly-review-planning`: the habit summary shown with the habit-minimum
  reflection prompt covers the **review week** (selected weekStart − 7 days
  through the day before the selected week's start) instead of the selected
  week, and its title explicitly names that week with an 上週 marker.
  Everything else in the Review tab is unchanged.

### New Capabilities

(none)

## Impact

- **New files**: `openspec/changes/weekly-review-habit-week/` (this folder —
  proposal, design, tasks, spec delta).
- **Modified files** (implementation phase):
  - `src/components/WeeklyReview.jsx` — add review-week derived values;
    habit fetch range + habit summary title/tooltip use them.
  - `src/__tests__/WeeklyReview.test.jsx` — update the two habit-range /
    habit-label assertions on top of the WIP test file.
- **Spec deltas**: `specs/weekly-review-planning/spec.md` — modifies the
  "Weekly reflection prompts" requirement (habit summary follows the review
  week). `habit-tracking-unit` is intentionally NOT touched: habit tracking
  semantics (units, entries, aggregation) are unchanged; only the date range
  the review panel requests differs.
- **No new npm packages.** Uses existing React, date-fns.
- **Backward compatibility**: fully compatible — the API contract is
  untouched, the change is display/data-range only. Weeks without entries in
  the review week render 0m chips as today, but correctly labelled.

## Open coordination note (do NOT silently bury)

`master` currently carries **uncommitted WORK-toggle Phase 1 changes**
(kanban `t_0e736d8f` blocked/WIP) touching `server/db.js`,
`server/routes/weeklyReviews.js`, `server/routes/weeklyObjectives.js`,
`src/api.js`, `src/components/WeeklyReview.jsx`,
`src/components/WeeklyObjectives.jsx`, `src/components/WeeklyReview.css`,
`src/__tests__/WeeklyReview.test.jsx`,
`src/__tests__/WeeklyObjectives.test.jsx`, and
`src/__tests__/wrModeStorage.test.jsx`.

This proposal only writes OpenSpec artifacts — commit `06421e8` remains the
last code commit and **no existing tracked file is modified by this
proposal** (the only git changes are the new files under
`openspec/changes/weekly-review-habit-week/`).

The implementer who picks up this change MUST **start from the WIP working
tree** — either rebase their branch on the WIP state or wait for it to land
before editing `WeeklyReview.jsx` / `WeeklyReview.test.jsx`. Do NOT branch
from `HEAD`; the diff would collide with the WIP on the same files. The two
updated test assertions MUST be written on top of the WIP version of
`src/__tests__/WeeklyReview.test.jsx`. The implementation is additive by
design (new derived variables `reviewWeekStart` / `reviewWeekEnd` /
`reviewWeekRangeLabel`; no edits to mode state, `loadWeek` signature,
`weekRangeLabel`, routes, or DB).