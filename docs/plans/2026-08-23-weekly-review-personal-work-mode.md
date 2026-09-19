# Weekly Review — Personal / Work Mode Toggle (Exploration & Decision Doc)

Task: t_7261a112 · Repo: C:\git\project_mgmt_tool (DayFrame) · Date: 2026-08-23
Status: exploration only — no code written. Awaiting Anderson's option pick before proposal.

## Current state (verified in repo)

- `src/components/WeeklyReview.jsx` renders 3 sections: Cleanup, Gratitude,
  Goals (reflection + goals + bridging actions + key-events grid).
- Persistence: `weekly_reviews` table, one row per week
  (`UNIQUE(weekStart)`), JSON columns cleanupTasks / gratitudeEntries /
  reflectionAnswers / weeklyGoals / syncFlags.
  API: `GET/PUT /api/weekly-reviews?weekStart=` keyed by weekStart ONLY.
- Bridging action `syncGoals` writes review goals into
  `weekly_objectives` (also `UNIQUE(weekStart)`, no mode concept).
  That table is ALSO rendered by `WeeklyObjectives` on the DailyPlanner tab —
  so objectives are shared surface between planner and review.
- Habits: single flat list (`habits`: name/color/frequency/isArchived/sortOrder),
  no mode/category column. Habit summary chips in the review pull ALL
  non-archived habits regardless of context.
- Key events: one global `key_events` list; categories already include a
  'Personal' category but there is no work/personal split of data.
- Migration precedent: db.js uses try/catch `ALTER TABLE ... ADD COLUMN`
  blocks — cheap, safe pattern to follow.

## Design questions → answers

1. SCOPE (whole doc vs per-section): whole-doc mode. Per-section mode flags
   multiply state and make the "two separate reviews" mental model impossible;
   the user's stated need is separating personal life vs work reviews.
2. DATA MODEL: see Option B below — mode column + composite uniqueness.
3. HABITS: habits table has no mode field. Recommendation: add optional
   `mode TEXT DEFAULT ''` ('' = shows in both). Out of MVP scope if desired —
   see trade-offs.
4. SYNC: weekly-objectives has no mode. Recommendation: extend with same
   `mode` column so Work goals sync to a Work objectives row and don't
   clobber Personal ones on the DailyPlanner.
5. UI: segmented control (Personal | Work) placed in the wr-week-nav row,
   right side. Persist last-selected mode in localStorage
   (`wr.mode`) — per-week persistence adds friction with no benefit since
   both docs exist for every week anyway.
6. MIGRATION: existing rows default mode='personal'; backfill is one UPDATE;
   no data destroyed. UNIQUE(weekStart) must be rebuilt as
   UNIQUE(weekStart, mode) — SQLite requires table rebuild for that.
7. SIBLING TASK: t_93d76dc1 (dev-builder) has UNCOMMITTED changes in
   WeeklyReview.jsx + its test (habit-hours fix, branch
   fix/weekly-review-habit-hours). The toggle feature touches the SAME two
   files. Coordination note posted on my card; implementer should rebase on
   that branch or wait for merge before starting.

## Options

### Option A — UI-only filter (no schema change)
Keep one doc per week; add a client-side mode tag on entries
(e.g. prefix or tag each goal/gratitude with personal/work) and filter in UI.
- Pros: zero migration, zero API change, ~1 day work.
- Cons: pollutes data with ad-hoc tags; server stays week-keyed so old
  clients/tests break subtly; doesn't cleanly separate reflection answers or
  habit summary; feels hacked. NOT recommended.

### Option B — Two independent docs per week (mode column) ★ RECOMMENDED
Add `mode TEXT NOT NULL DEFAULT 'personal'` to `weekly_reviews` (and
`weekly_objectives`). Key becomes (weekStart, mode). Each mode gets its own
full review doc — cleanup, gratitude, reflection, goals, syncFlags all
independent. Frontend holds `{personal, work}` doc pair; toggle switches the
active one; saves go to `/api/weekly-reviews?weekStart=X&mode=Y`.
- Pros: true separation (the actual ask); old data preserved as personal;
  API change is additive (new query param defaults to personal); habits
  section can filter by habit.mode later without breaking anything.
- Cons: requires SQLite table rebuild to change UNIQUE constraint; PUT
  payload gains mode; tests need mode-aware mocks (~19 test cases touched).
  Effort ≈ 2–4 days including migration + tests.

### Option C — Separate work-only sections appended to same doc
One doc per week; ADD new JSON columns (workGoals, workReflection...) next
to existing ones; Work toggle reveals the work-* fields.
- Pros: no unique-constraint rebuild; existing columns untouched.
- Cons: two half-docs glued together; every handler doubles; syncFlags
  ambiguity (which mode synced?); long-term mess. Not recommended unless
  migration risk is unacceptable.

## Recommendation

Option B. It matches the user's mental model ("分開兩個 mode"), keeps the
data model honest, and follows the repo's existing additive-migration style.
Pair it with:
- habits.mode nullable extension (phase 2 — can ship later, UI hides nothing
  until habits are tagged);
- weekly_objectives.mode so syncGoals writes per-mode rows (DailyPlanner's
  WeeklyObjectives should then get the same toggle or show both grouped).

## Data-migration risk notes

1. Table rebuild needed for UNIQUE(weekStart→weekStart+mode): copy rows to
   temp table, drop, recreate, copy back inside a transaction. Low risk but
   MUST be wrapped like existing try/catch migrations and tested against a
   copy of data/app.db (7 review rows, 15 objective rows exist today — small,
   easy to verify by row count after migration).
2. Any client that calls PUT without mode gets 'personal' — backwards safe.
3. GET without mode returns personal — existing tests keep passing except
   those asserting the exact request URL/mocks.
