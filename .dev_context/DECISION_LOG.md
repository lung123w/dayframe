# DayFrame — Decision Log (ADRs · conventions · policies)

Owner: `df-lead` · Last updated: 2026-09-20 (v1.1 — ADR-005…008 re-verified against the code at `master` `526f3b3`; ADR-010…011, CONV-005, POL-006 added; v1.2 — ADR-012 added (`habits.frequency` normalization at the API boundary) + a §D open item for the one deliberately un-repaired live row)

Append-only. Newest decisions at the bottom of each section. Every entry names the evidence (commit, file) — not intentions.

## A. Architecture decisions (ADR)

**ADR-001 — Local-first, single user, no authentication.**
One Windows machine, one SQLite file, no login, no multi-tenancy. Consequence: "who did what" is not modelled; `team_members` is an assignee directory only. Do not add auth/workspaces without an explicit owner decision.

**ADR-002 — SQLite + idempotent, add-only migrations.**
`server/db.js` creates tables with `CREATE TABLE IF NOT EXISTS` and evolves them with `try { db.exec('ALTER TABLE … ADD COLUMN …') } catch {}`. No ORM; routes use better-sqlite3 prepared statements. Consequence: every new column must carry a default so existing rows stay valid; table rebuilds are a last resort and require a migration plan. See ADR-010 for the trap this creates on a DB that already exists.

**ADR-003 — Images are base64 in the DB, not files on disk.**
Precedents: `yearly_goals.images`, `tasks.descriptionImages`, `monthly_reviews.images`; `express.json({ limit: '50mb' })` exists for this (`server/index.js:25`). List endpoints strip image fields (`server/routes/monthlyReviews.js:29-33`); detail endpoints carry them; the client caps a pasted photo at 8 MB (`src/components/MonthlyReview.jsx:51`). Consequence: the DB (and its backup) is the single artefact — no orphaned uploads, no static-file serving to build.

**ADR-004 — Period-scoped documents, explicitly keyed.**
Weekly review/objectives key on `weekStart` (Monday, HK time), monthly finance review on `monthKey` (`YYYY-MM`), yearly goals on `year`, daily notes on `date`. Period parameters are always passed explicitly by the caller. Past periods are read-only in the UI. Consequence: no implicit "current period" logic inside a query.

**ADR-005 — One week selector serves review *and* planning; the habit panel reads the reviewed week.** *(verified 2026-09-20)*
The weekly-review document, goals, sync and key events belong to the **selected (plan) week**; the habit summary panel reads **`weekStart − 1`** — the week being reviewed. Evidence: `src/components/WeeklyReview.jsx:323-327` (`reviewWeekStart/reviewWeekEnd` = `subWeeks(…, 1)`) and `:345` (habit entries fetched `from=reviewWeekStartStr&to=reviewWeekEndStr`); commit `13ecc69` ("fix(review): habit summary always shows the review week (selected week - 1)"); OpenSpec change `weekly-review-habit-week`.
Consequence: the previous "show 0m for last week" symptom (single selector bound to one week for both roles) is fixed — do not "simplify" the panel back to the selected week.

**ADR-006 — "Plan My Day" was removed; `todayOrder` stays.** *(verified 2026-09-20)*
Commit `dc6869b` deleted the button, `DailyPlanningModal.jsx`, `planningGroups.js`, its tests, the `.plan-my-day-btn` CSS and the README section (-512 lines) because the Today view already provides planning. `todayOrder` + `syncTodayOrder` + `utils/todayOrder.js` are **shared core state** used by TodayView and DailyPlanner and must not be removed with it (`src/App.jsx:34, 53, 202-211`; `src/utils/todayOrder.js`; `src/utils/syncTodayOrder.js`). OpenSpec change `remove-plan-my-day` — **still in `openspec/changes/`, not archived**, despite shipping.

**ADR-007 — Recurring tasks: `recurrencePattern` is persisted as a JSON object.** *(pattern shape corrected 2026-09-20)*
`{"type":"weekly","daysOfWeek":[0],"interval":1,"endDate":"…"}`. Persisted as a *string* it breaks rendering (the frontend reads `.daysOfWeek`, which is `undefined` on a string). The base `dueDate` must fall on a day the pattern actually produces. Consequence: verify the stored type after any write (`type(...) is dict`).
The full key set the code reads (`src/utils/recurrence.js:41-51, 145-201`): `type` (`daily|weekly|monthly|yearly`) · `interval` · `daysOfWeek` (0=Sun, weekly only) · `dayOfMonth` · **`weekOfMonth: 'last'` + `dayOfWeek` + optional `hour`/`minute`** (the "last Saturday of the month" form the monthly finance reminder uses) · `endDate` · `endAfterOccurrences`. `generateRecurringTasks` fast-forwards from `dueDate` and stops at 500 instances (`:109-120`).

**ADR-008 — Habits are time- or count-based, one entry per day.** *(count half corrected 2026-09-20 — see ADR-011)*
`habit_entries` is `UNIQUE(habitId, date)`; the value is written to `timeSpentSeconds` (seconds). A second POST for the same day **does not update** — it returns **409** and the stale value survives (`server/routes/habitEntries.js:43-48`). Consequence: writes go GET → DELETE (`/by-date?habitId=&date=`) → POST, or PUT the existing entry; never trust a POST's success message alone.
Duration habits are the only working shape today: the count branch of this decision (reps in a `count` field, selected by `getTrackType(habit)`) exists **only in the client** and never reaches the database — corrected in ADR-011.

**ADR-009 — Weekly review Personal/Work `mode` column: designed, reviewed, NOT on master's code path.**
OpenSpec change `weekly-review-personal-work-mode` (proposal + design + spec deltas, `openspec/changes/weekly-review-personal-work-mode/`) proposes `mode` on `weekly_reviews` and `weekly_objectives` with `UNIQUE(weekStart, mode)` and a `wr.mode` localStorage preference. Its build (`kanban t_0e736d8f`) was paused and its work-in-progress is **parked in a git stash** in this repo; the untracked `src/__tests__/wrModeStorage.test.jsx` at the repo root belongs to that lane — leave it alone. Consequence: master's `server/db.js` has no `mode` column; anything touching weekly review must not assume it in code, and must not drop or apply that stash. **The live DB does have it — see ADR-010.**

**ADR-010 — The live DB can be ahead of the code; name which side you checked.** *(2026-09-20)*
`CREATE TABLE IF NOT EXISTS` never re-shapes an existing table, so a schema change that only exists on a branch or in a local rebuild leaves the *live* `data/app.db` permanently in the newer shape while master's `db.js` still declares the old one. Verified 2026-09-20: the live DB has **17 tables** — the 16 in `db.js` plus an orphan `google_calendar_tokens` that no file in this repo creates — and its `weekly_reviews` / `weekly_objectives` carry `mode TEXT NOT NULL DEFAULT 'personal'`, `UNIQUE(weekStart, mode)` and `CHECK(mode IN ('personal','work'))` (ADR-009's shape) although master still declares `UNIQUE(weekStart)`.
Consequence: "the column does not exist" is not a complete statement — it must say *against what*. Before designing around a missing/extra column, read the DDL out of `sqlite_master` with `sqlite3 data/app.db` and say in the card which source you used. Do not assume a fresh clone reproduces the running DB, and do not delete `google_calendar_tokens` without finding its writer (it is evidence of an out-of-repo script).

**ADR-011 — Habit count tracking shipped client-only and is inert; fix requires schema + routes.** *(2026-09-20)*
The archived change `openspec/changes/archive/2026-07-12-habit-count-tracking/` (commit `fdc8e05`) added `trackType` on habits and `count` on entries — but `git show --stat fdc8e05` lists **18 files, none under `server/`**. Verified against the live DB and the routes: `habits` has no `trackType` column and `POST`/`PUT /api/habits` never read it (`server/routes/habits.js:36-46, 60-70`), so a "Repetitions" habit silently saves as a duration habit and `getTrackType()` (`src/utils/habits.js:268-270`) always returns `'duration'`; `habit_entries` has no `count` column and the entry routes read only `timeSpentSeconds` (`server/routes/habitEntries.js:32, 40, 56`) while the UI sends `count` (`src/components/HabitTracker.jsx:89, 112-120`, `src/components/PlannerHabitsPanel.jsx:66-80`) — the reps are discarded and the day is stored as 0.
Consequence: every `entry.count` reader (`getEntryValue`, `HabitHeatmap`, `HabitTracker`, the weekly-review habit chips) reads `undefined`; do not treat count tracking as a working feature and do not "fix" it in a frontend-only card. The repair is two `ALTER TABLE … ADD COLUMN` migrations plus route field plumbing, with a verify script against a DB copy.
**Resolved 2026-09-20 by `t_74db36be`** (branch `fix/habit-count-tracking-persistence`): the two add-only guarded ALTERs landed in `server/db.js:290-301` (appended *last* in the migration list so no earlier line number in the dev-context docs shifts); `POST`/`PUT /api/habits` now persist `trackType` (accepting only `duration|count`, falling back to `duration`, keeping the stored value when the body omits it) and `POST`/`PUT /api/habit-entries` persist `count` (whole, non-negative, 0 otherwise) while `timeSpentSeconds` behaves exactly as before (`server/routes/habits.js:6-12, 45-51, 70-77`; `server/routes/habitEntries.js:8-12, 39-47, 60-66`). **No client change was needed** — the UI already sent and read both fields. Verified by booting the new code against a legacy-shaped *copy* of the live DB (columns added, 394 entries / 6 habits unchanged, 19/19 API checks incl. the duration path and the 409 duplicate-day contract) before the same two ALTERs were applied to the live DB (DATA_MODEL §5, §6).

**ADR-012 — A JSON column is normalized at the API boundary, never in the client.** *(2026-09-20)*
`habits.frequency` is a TEXT column documented to hold a JSON object (`server/db.js:66`), but the value that reaches it can be a JSON *string* of that object: `POST /api/habits` did `JSON.stringify(b.frequency)` and the `dayframe` skill's documented "Create habit body" example sends `frequency` as a string, so one live row (id 9, `Gym Session`) is encoded twice; `PUT` then re-stringified whatever the read path produced, so the row could never heal. Every client reader assumes an object — `HabitTracker.jsx:247-254` (`getFrequencyLabel` printed `undefinedx per week`), `:289-290`, `src/utils/habits.js:13-26, 39-44, 150-155`, `HabitHeatmap.jsx:24, 55, 71`, `HabitModal.jsx:8-19` — and the streak maths silently fell through to the *daily* branch. Verified 2026-09-20: one unparsable cell makes the whole list endpoint answer **500** on the base code (`e6c1a91`), and **200** with the row degraded to `{type:'daily'}` after.
Resolution (`fix/habit-frequency-normalization`): one dependency-free module `server/habitFrequency.js` exporting `normalizeFrequency(value)`, called from `server/routes/habits.js:21` (read, inside `parseHabit`), `:52` (`POST`) and `:79` (`PUT`). The result is always `{type:'daily'}`, `{type:'weekly', timesPerWeek}` or `{type:'weekdays', days}` — never a string, never `null` — and the function is **total** and **idempotent**, because the `PUT` path feeds an already-normalized value back in. Reads stay read-only; the `PUT` self-heal is the *only* repair, so `server/db.js` deliberately gained **no** boot-time repair migration.
Rejected alternatives (design.md D3–D5): guarding the client label only (the visible string is fixed but the streak maths, the heatmap and every future consumer — scripts, cron jobs, agents — still read a string); normalizing at the client fetch layer (leaves the undocumented shape on the wire); write-side validation returning 400 for a non-object `frequency` (the string form is an already-documented, working client path, and a 400 would still not repair the stored row).
Consequence: when a column's contract is "an object", normalize at the boundary and unit-test the normalizer without importing `server/db.js` — that module opens Anderson's live DB at import time, so a test that imports it would touch his data. The known cost is a display default: the repaired `Gym Session` row shows `1x per week` until the real cadence is set in the edit modal.

## B. Product / UI conventions

**CONV-001 — Empty is not broken.** New periods legitimately start empty (a fresh week has no habit entries). Show an explicit empty state; never render a period that silently belongs to a different week.

**CONV-002 — Past periods are read-only, and the UI says so.** In the finance review, read-only means `selectedMonthKey !== currentMonthKey` (`src/components/MonthlyReview.jsx:218-219`) — so **future** months are read-only too, not just past ones. The paste zone and per-item actions hide; thumbnails and the lightbox stay available.

**CONV-003 — Hong Kong time, computed at run time.** Weeks start Monday. Never hardcode a date (a hardcoded date once wrote a task to the wrong day — see the `dayframe` skill).

**CONV-004 — Reports carry their assumptions.** Any number shown to Anderson states what period and what source it came from (e.g. "Habits (Review week: Sep 7 – Sep 13)", `src/components/WeeklyReview.jsx:716`).

**CONV-005 — A GET on a missing period returns an unsaved default; one GET is a writer.** *(2026-09-20)*
`weekly-reviews`, `weekly-objectives`, `daily-notes` and `yearly-goals` answer a read for a non-existent period with an in-memory default document instead of 404, and `monthly-reviews/by-month` does the same — none of them persist anything. The exception is `GET /api/monthly-reviews/current`, which **creates and persists** the current month's review from the template on first read (`server/routes/monthlyReviews.js:106-115`). Consequence: never assume "GET is read-only" in this app; when a card needs to know whether a period exists, check the DB (or a list endpoint), not the presence of a response body.

## C. Team & process policies

**POL-001 — Zero-human-gate.** No kanban task waits for Anderson's approval — proposal, build start, commit, archive, Done included. The `df-tester` verdict **is** the acceptance gate; a pass means the task is marked Done. Notification is visibility, not a gate. Only two things stop for explicit confirmation: (1) destructive git (force push, history rewrite, discarding uncommitted work), (2) operations that overwrite Anderson's real data (`data/app.db`, backups).

**POL-002 — Every change ships on a branch + PR; `master` stays clean.**
Branch names: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`. Conventional commits. `gh` is not installed — create PRs via the REST API using a token from `git credential fill`. Repo history: the 2026-09 features were first committed straight to `master` and had to be re-split into branches (PRs #10–#14) — do not repeat that.

**POL-003 — Never touch another worker's uncommitted work.**
`git status` before starting. If a file carries someone else's uncommitted hunks, stage only your own (`git apply --cached --ignore-space-change` on a filtered patch) — never `git add` the whole file, `git stash`, `git checkout --` or `git reset` around it. A parked WIP stash (`WORK-toggle Phase 1`) exists in this repo; see also ADR-009 and the untracked `src/__tests__/wrModeStorage.test.jsx`.

**POL-004 — Verification before Done.**
`npm run test:run` + `npm run lint` + `npm run build`, plus a **headless-browser screenshot** for any UI change (the tester starts the app itself), and read-only data checks. Separate pre-existing failures from the change's own and name which is which. Report what could not be verified.

**POL-005 — Dev context is mandatory (Rule A / Rule B).**
Read `ARCHITECTURE.md` / `DATA_MODEL.md` / `ROUTE_MAP.md` (Rule A) before writing specs, migrations or code; update the affected documents (Rule B) before the task is marked Done. `df-lead` owns this directory.

**POL-006 — Treat source as public: no secrets, credentials or real account numbers in the repo.** *(2026-09-20)*
The GitHub repo `lung123w/dayframe` is **public** (`api.github.com/repos/lung123w/dayframe` → `"private": false`), while `server/routes/financialCards.js:6-16` hardcodes the SEED_CARDS list with **real account numbers** (Hang Seng, HSBC, Citibank, BEA, BOC) and inserts them on the first `GET /api/financial-cards` against an empty table (`:31`).
Consequence: new seed/lookup/reference data must not live in tracked source — it goes in a gitignored file under `data/` (the repo already ignores `data/*.db`, `*.export.json`, `*.export.csv`). Do not paste account numbers, tokens or statements into specs, cards, comments or commits. Removing a value from `HEAD` does not un-publish it from history: scrubbing history is destructive git and needs Anderson's explicit call (POL-001).

## D. Open items

- **WORK-toggle Phase 1** — `mode` column work parked in a stash; needs a decision to land it (ADR-009). The live DB already carries the shape (ADR-010).
- **Finance photos Phase 2** — per-card statement photos (Phase 1 = review-level Photos section only).
- **Key-events grid period conflation** — the key-events grid still uses the selected (plan) week like the document, unlike the habit panel which reads the reviewed week; a follow-up candidate (ADR-005 scope note). Note there are **two** key-event grids (review + planner `WeeklyObjectives`), both writing `/api/key-events`.
- ~~**Habit count tracking is inert** (ADR-011)~~ — **fixed 2026-09-20** by `t_74db36be` (two guarded ALTERs + route plumbing; see ADR-011's resolution note and DATA_MODEL §6).
- **Real account numbers in a public repo** (POL-006) — `SEED_CARDS` must move out of tracked source. Fix card: `t_7ed32f31`. Rotation/history decision stays with Anderson.
- **Live `habits.frequency` row 9 is still double-encoded** — identified read-only on 2026-09-20 (the only such cell in all 17 tables) and **deliberately not repaired** (ADR-012, design.md D6): the API normalizes it on every read and the row self-heals on the next save of that habit through the UI. A hand `UPDATE` on Anderson's real data needs his explicit call (POL-001); recorded in DATA_MODEL §5.
- **Untracked leftovers** — `not relevant/CodeNomad/` (gitignored) still contributes **2 failing test files** to a bare `npx vitest run` (`packages/server/src/filesystem/__tests__/search-cache.test.ts`, `.../ui/__tests__/remote-ui.test.ts`); `src/__tests__/wrModeStorage.test.jsx` is another lane's WIP test (ADR-009). The previously listed `_db_check.cjs` / `_db_smoke.mjs` no longer exist at the repo root.
- **Pre-existing in-suite test failure** — `src/__tests__/MiniWeekBar.test.jsx:38-39` expects 9 buttons (7 day + 2 arrow), the render yields 10. Full suite: 30 test files, 331 tests, 330 pass.
- **Orphan components** — `Calendar.jsx`, `DailyShutdown.jsx`, `DayPanel.jsx`, `OutstandingTasks.jsx` are imported by nothing (ROUTE_MAP §1). Delete or wire up; do not extend them.
- **Shipped-but-unarchived OpenSpec changes** — `remove-plan-my-day` (commit `dc6869b`), `weekly-review-habit-week` (commit `13ecc69`, tasks still unchecked), `fix-daily-workflow-display` and `fix-recurring-task-isolation` (both all-tasks-checked) are still sitting in `openspec/changes/`. Archive them so `openspec list` reflects reality. Caveat: `fix-recurring-task-isolation/tasks.md` describes an `instanceOverrides` field that did **not** ship — the shipped code uses `statusOverrides` / `statusFromOverrides` (`src/App.jsx:164-175`); reconcile the tasks file before archiving.
- **`README.md` does not point at `.dev_context/`** — the repo entry point should gain a one-line pointer to this directory (deferred: this change touches `.dev_context/` only).
- **Unused dependency** — `cors` is declared in `package.json:29` but no CORS middleware is mounted anywhere in `server/`; either mount it or drop it.
