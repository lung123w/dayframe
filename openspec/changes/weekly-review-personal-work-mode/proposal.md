## Why

DayFrame's Weekly Review (Cleanup → Gratitude → Reflection + Goals) currently
keeps **one document per week** keyed by `weekStart`. The user runs two
parallel reviews every weekend — one for personal life, one for work — and
today the two get written into the same doc, so each mode ends up clobbering
the other. The `weekly_objectives` table that the Review tab "syncs goals"
into is shared with the DailyPlanner's `WeeklyObjectives` panel, so the same
collision happens there. This change lets the user keep personal and work
reviews fully separated for the same week.

The exploration & decision doc
(`docs/plans/2026-08-23-weekly-review-personal-work-mode.md`) compared three
options. Option B (a `mode` column, key becomes `(weekStart, mode)`,
back-compat via default `'personal'`) was picked because it:

- matches the user's mental model (two independent docs per week),
- preserves existing data as personal without manual fix-up,
- keeps the migration additive and consistent with the repo's existing
  try/catch `ALTER TABLE` pattern (see `server/db.js`), and
- sets up a clean schema for an eventual habit mode-tag (Phase 2, scoped out
  here).

## What Changes

- **Data model**
  - `weekly_reviews` gains a `mode TEXT NOT NULL DEFAULT 'personal'`
    column; the unique constraint becomes `UNIQUE(weekStart, mode)`.
    `mode` is one of `'personal' | 'work'`.
  - `weekly_objectives` gains the same `mode` column with the same
    constraint change, so the Review tab's "Write weekly goals to DayFrame"
    bridging action writes into a mode-specific row and does not clobber
    the other mode's objectives on the DailyPlanner.
  - Each mode has its own full review document (cleanup, gratitude,
    reflection, goals, syncFlags all independent).
- **API** (`server/routes/weeklyReviews.js`,
  `server/routes/weeklyObjectives.js`)
  - `GET` and `PUT` accept `?mode=` (defaults to `'personal'` when absent);
    the bare existing client contract keeps working.
  - `PUT` body MAY carry `mode`; when absent, the server writes the row
    for `'personal'`.
  - The list-style `GET /` (no `weekStart`) returns rows for all modes
    with `mode` in each payload.
- **Migration** (in `server/db.js`)
  - Backfill all existing `weekly_reviews` and `weekly_objectives` rows
    to `mode='personal'` (one `UPDATE` per table).
  - Rebuild each table to switch `UNIQUE(weekStart)` →
    `UNIQUE(weekStart, mode)`. SQLite cannot change a UNIQUE constraint
    in place; the rebuild pattern is: create temp table with the new
    shape, copy rows, drop original, rename temp — wrapped in a single
    transaction. Wrapped in try/catch so already-rebuilt DBs skip the
    rebuild cleanly.
- **UI** (`src/components/WeeklyReview.jsx`)
  - Add a segmented control `Personal | Work` in the week-nav row
    (right side), persistent across week navigation.
  - Frontend holds the current mode in state; loads/saves the per-mode
    document. The cleanup-template seed, save handler, syncGoals,
    habit summary load and key-event handlers all operate on the active
    mode.
  - Last-selected mode persists across sessions (see design.md §3 for
    the global-vs-per-week decision; **recommendation: global**, key
    `wr.mode`, default `personal`).
- **DailyPlanner's `WeeklyObjectives`** (`src/components/WeeklyObjectives.jsx`)
  - Picks up the same mode (read from the same `wr.mode` localStorage
    key for consistency) and renders the matching row. If the panel is
    open on a week whose other mode has objectives, they remain
    untouched in storage but are not shown (no cross-mode leak in one
    glance).
  - When the Review's "sync goals" action runs, it writes to the row
    matching the **active review mode**, not always `'personal'`.

- **Phase 2 — Habits mode (roadmap only, NOT built in this change)**
  - Add a `mode TEXT NOT NULL DEFAULT ''` column to the `habits` table
    (`''` means "shows in both modes"). Habit CRUD surfaces an optional
    Personal/Work tag in the HabitModal; the Weekly Review's habit
    summary chip filters by the active mode.
  - This proposal only documents the phase-2 schema intent (see
    `habit-tracking-unit/spec.md` ADDED Requirement). No code lands for
    it in this change.

## Capabilities

### Modified Capabilities

- `weekly-review-planning`: The Review tab becomes mode-aware. Each
  week holds two independent review documents (`mode='personal'` and
  `mode='work'`); cleanup, gratitude, reflection, goals, and syncFlags
  are scoped per mode. The UI exposes a Personal/Work segmented
  control. Migration backfills existing rows as `personal`. API gains a
  `?mode=` query param (defaults to `'personal'`).
- `weekly-goals-key-events-panel`: The DailyPlanner's weekly panel
  reads the active mode (shared with the Review tab) and renders the
  matching `weekly_objectives` row. The Review tab's "sync goals"
  action writes to the mode of the active review.

### New Capabilities

(none)

### Roadmap Capabilities (not delivered here)

- `habit-mode-tagging` (Phase 2): habits gain an optional Personal/Work
  tag (`''` = both). Tracked as an ADDED requirement in
  `habit-tracking-unit/spec.md` so future proposals can pick it up
  without re-discovering the schema intent.

## Impact

- **New files**: `openspec/changes/weekly-review-personal-work-mode/`
  (this folder — proposal, tasks, design, spec deltas).
- **Modified files**:
  - `server/db.js` — add `mode` column to `weekly_reviews` and
    `weekly_objectives`, backfill `'personal'`, rebuild UNIQUE
    constraint (one migration block per table, in the existing
    try/catch ALTER TABLE style).
  - `server/routes/weeklyReviews.js` — accept `?mode=` on GET; carry
    `mode` in SELECT/UPDATE/INSERT; default to `'personal'`.
  - `server/routes/weeklyObjectives.js` — same shape.
  - `src/api.js` — `weeklyReviewService.getByWeek(weekStart, mode?)`
    and `upsert(weekStart, doc, mode?)`; same for
    `weeklyObjectiveService`.
  - `src/components/WeeklyReview.jsx` — add mode state + segmented
    control, plumb mode through load/save/syncGoals; habit summary
    unchanged but driven by the active mode for Phase 2 readiness.
  - `src/components/WeeklyObjectives.jsx` — read shared mode from
    `localStorage` and load/save per-mode objectives; existing
    one-doc-per-week behaviour preserved when no mode key is set.
- **Spec deltas**:
  - `specs/weekly-review-planning/spec.md` — adds a `Personal/Work
    mode split` section (mode column, segmented control, API contract,
    migration, habit summary scope).
  - `specs/weekly-goals-key-events-panel/spec.md` — adds a
    `Mode-aware weekly panel` section (per-mode objectives row,
    shared mode with the Review tab, sync action writes per-mode).
  - `specs/habit-tracking-unit/spec.md` — adds a single
    `Habit mode tag (Phase 2 roadmap)` requirement that documents the
    planned column without imposing behaviour in this change.
- **No new npm packages.** Uses existing React, date-fns, react-icons,
  Express, better-sqlite3.
- **Backward compatibility**
  - Clients that call `GET /api/weekly-reviews?weekStart=X` (no mode)
    continue to receive the personal doc.
  - Clients that PUT without `mode` write to the personal row.
  - Existing tests that assert URL/mocks against the unparam'd endpoint
    keep passing; new tests cover the `?mode=` case.

## Open coordination note (do NOT silently bury)

`fix/weekly-review-habit-hours` (dev-builder task `t_93d76dc1`) has
**uncommitted** changes in `src/components/WeeklyReview.jsx` and
`src/__tests__/WeeklyReview.test.jsx` (habit-time-spent format fix +
yesterday-default-week). This proposal only writes OpenSpec artifacts —
no code. The implementer who picks up this change MUST either rebase on
`fix/weekly-review-habit-hours` or wait for it to merge before starting;
otherwise two branches will collide on the same file.