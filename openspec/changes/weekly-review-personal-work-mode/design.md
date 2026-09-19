# Design — Weekly Review Personal/Work Mode

## 1. Why a `mode` column, not two tables / not a JSON tag

The natural shapes for "two reviews per week" are:

- **(a) Two physical tables** — `weekly_reviews_personal` and
  `weekly_reviews_work`. Clean separation, but breaks the symmetry of
  one shared SQL route; doubles route code; duplicates the migration
  trail; loses the easy "list all modes for a week" query.
- **(b) `mode` column on one table** (this proposal). One route, one
  schema, easy `WHERE weekStart=? AND mode=?` lookups, additive
  migration. SQLite's lack of native `ENUM` is fine — `CHECK(mode IN
  ('personal','work'))` enforces it cheaply.
- **(c) JSON tag inside existing JSON columns** — rejected: pollutes
  the data and still leaves `UNIQUE(weekStart)` unable to host two
  docs per week.

`(b)` is the smallest schema delta that solves the actual problem and
keeps the route file single-purpose.

## 2. UNIQUE(weekStart) → UNIQUE(weekStart, mode): table rebuild

SQLite cannot `ALTER TABLE ... DROP CONSTRAINT` and cannot rename a
UNIQUE index in place. The standard fix is the rebuild dance:

```sql
BEGIN;
CREATE TABLE weekly_reviews_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekStart TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'personal',
  cleanupTasks TEXT NOT NULL DEFAULT '[]',
  ...
  UNIQUE(weekStart, mode)
);
INSERT INTO weekly_reviews_new
  (id, weekStart, mode, cleanupTasks, ..., createdAt, updatedAt)
  SELECT id, weekStart, 'personal', cleanupTasks, ..., createdAt, updatedAt
  FROM weekly_reviews;
DROP TABLE weekly_reviews;
ALTER TABLE weekly_reviews_new RENAME TO weekly_reviews;
COMMIT;
```

Backfill happens during the INSERT step (literal `'personal'`). The
`weekly_objectives` table follows the exact same pattern.

**Idempotency.** Wrap each block in a try/catch that checks for
`'no such column'`, `'UNIQUE constraint failed'`, or
`'table weekly_reviews already exists'` errors — same style as the
existing migrations in `server/db.js`. A DB that already has `mode`
will skip the rebuild; a fresh DB lands in the new shape directly via
the `CREATE TABLE IF NOT EXISTS` statement at the top of the file.

**Risk envelope.** Realistic data: 7 review rows, 15 objective rows.
Wrapping in a single transaction + the try/catch guards means partial
state is impossible — either the rebuild lands or the original table
is untouched.

## 3. UI persistence: global vs per-week mode

The user picks up the Review tab often across consecutive weeks and
mostly reviews one mode at a time. Two persistence shapes:

- **Global** (`localStorage['wr.mode'] = 'personal'|'work'`). One
  toggle state for the whole app. Switching weeks keeps the same mode
  selected. Matches the user's stated workflow: "I review all my
  personal weeks in one sitting, then work weeks in another."
- **Per-week** (`localStorage[`wr.mode.${weekStart}`]`). Each week
  remembers its own mode. Useful if the user reviews a personal
  reflection this week, then jumps back to last week's work review.
  Adds friction (more state to manage) and is easy to forget.

**Recommendation: global.** Per-week persistence is a nice idea in the
abstract but the Review tab already has a "This Week" jump button;
users who context-switch between modes a lot will simply toggle the
segmented control and the next reload remembers. The simpler model is
also easier to wire into `WeeklyObjectives` (one source of truth for
"which mode is active right now").

The DailyPlanner's `WeeklyObjectives` reads the same key
(`localStorage['wr.mode']`). If a Review was just saved in `work` mode
on a planner week, navigating to that week in the planner shows the
matching objectives without extra plumbing.

## 4. API shape — additive, defaults to `'personal'`

- `GET /api/weekly-reviews?weekStart=YYYY-MM-DD` — unchanged behaviour;
  server treats no-`mode` as `'personal'`.
- `GET /api/weekly-reviews?weekStart=YYYY-MM-DD&mode=work` — returns
  the work doc (or the default empty doc when none).
- `GET /api/weekly-reviews` (no `weekStart`) — returns the latest 12
  rows for **all** modes; each row carries its `mode` so the client
  can group.
- `PUT /api/weekly-reviews` body `{ weekStart, mode?, ...doc }` —
  `mode` is read from body, defaulting to `'personal'`. Same row upsert
  shape as today; uniqueness now keyed by `(weekStart, mode)`.

Identical contract for `weekly-objectives`. Both route files change in
lockstep.

## 5. Phase 2 — habits mode (deferred)

The `habits` table is single-mode today; the Weekly Review's habit
summary chip renders every non-archived habit. For Phase 2 we add
`mode TEXT NOT NULL DEFAULT ''` (empty = "both modes"). The UI work
is the heavier half (HabitModal Personal/Work choice, review-side
filter), so this proposal only documents the planned column so the
data team can plan migrations; no behaviour change in Phase 1.

## 6. Sibling task coordination

`fix/weekly-review-habit-hours` (kanban `t_93d76dc1`) has uncommitted
edits in the same two files (`src/components/WeeklyReview.jsx`,
`src/__tests__/WeeklyReview.test.jsx`). Phase-1 implementation must
either rebase on that branch or wait for it to merge before starting.
Flagged in `proposal.md` and on the kanban card.

## 7. Testing strategy**
- Existing `WeeklyReview.test.jsx` cases still pass against the
  default-mode path.
- New cases: (a) segmented control renders, (b) switching to `work`
  triggers a `getByWeek(week, 'work')` call, (c) PUT includes `mode`
  in the body, (d) `WeeklyObjectives` reads `wr.mode` from
  localStorage when mounting, (e) syncGoals writes to the active
  mode's row.
- New API smoke test (manual curl, since no server tests in repo):
  `GET ?mode=work` returns a default doc; `PUT` then `GET` round-trips;
  legacy call (no `mode`) returns the personal row.