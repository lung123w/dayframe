# DayFrame — Data Model

Owner: `df-lead` · Last updated: 2026-09-20 (v1.1 — every column re-checked against `server/db.js` CREATE blocks **and** ALTER migrations, plus the live DB; v1.2 — habit `trackType` / entry `count` columns added, `t_74db36be`; v1.3 — `habits.frequency` normalization contract (§1) + the double-encoded live row (§5), `fix-habit-frequency-normalization`)

SQLite, one file: `data/app.db` (gitignored). Schema is created in `server/db.js`; later columns arrive through **idempotent add-only migrations** (`try { db.exec('ALTER TABLE … ADD COLUMN …') } catch {}`). No ORM — `better-sqlite3` prepared statements inside `server/routes/*.js`.

Connection pragmas (`server/db.js:11-12`): `journal_mode = WAL`, `foreign_keys = ON`. **Foreign keys are actually enforced** — that is what nulls `tasks.projectId` when a project is deleted (`ON DELETE SET NULL`, `server/db.js:39`) and cascades `subtasks` / `habit_entries` / `workflow_completions`.

## 1. Tables (16 in `server/db.js`)

```mermaid
erDiagram
    projects ||--o{ tasks : "projectId (SET NULL)"
    tasks ||--o{ subtasks : "parentTaskId (CASCADE)"
    habits ||--o{ habit_entries : "habitId (CASCADE)"
    workflow_steps ||--o{ workflow_completions : "stepId (CASCADE)"
    financial_cards ||--o{ monthly_reviews : "cardEntries JSON references (no FK)"
```

### projects
`id` PK · `name` · `color` (default `#3788d8`) · `createdAt`

### tasks
`id` PK · `title` · `description` · `descriptionImages` JSON `'[]'` · `dueDate` · `priority` (`low|medium|high`, default `medium`) · `status` (`pending|completed`, default `pending`) · `projectId` → projects(id) ON DELETE SET NULL · `assignedTo` JSON `'[]'` (team member ids) · `isRecurring` 0/1 · `recurrencePattern` JSON **object** (nullable) · `statusOverrides` JSON `'{}'` · `statusFromOverrides` JSON `'[]'` · `createdAt` · `updatedAt`
Migrated in: `estimatedMinutes` · `sortOrder` (default 0) · `startTime` · `endTime` · `scheduledTime` (`server/db.js:213-241`)
> `recurrencePattern` must persist as a JSON **object** (`{"type":"weekly","daysOfWeek":[0],"interval":1}`). Stored as a string it breaks rendering (the frontend reads `.daysOfWeek`). Pattern keys the code actually consumes: `type`, `interval`, `daysOfWeek` (0=Sun), `dayOfMonth`, `weekOfMonth`/`dayOfWeek`/`hour`/`minute` (the "last Saturday" monthly form), `endDate`, `endAfterOccurrences` (`src/utils/recurrence.js:41-51, 145-201`). The base `dueDate` must fall on a day the pattern produces; `generateRecurringTasks` fast-forwards from `dueDate` and caps at 500 instances (`:109-120`).
> **Trap — `status` is not always `pending|completed` at rest.** The DDL default is `'pending'`, but `POST /api/tasks` writes `status: b.status || 'todo'` (`server/routes/tasks.js:49`), so a task created without a `status` sits in the DB as `'todo'`. The only thing that repairs it is the boot-time normalisation `UPDATE tasks SET status='pending' WHERE status IN ('todo','in-progress')` (`server/db.js:207-210`) — i.e. the value is normalised at the *next server restart*, not on write. The UI always sends a status, so this only bites scripts and cron callers. Live check 2026-09-20: 381 task rows, values are only `completed` (370) and `pending` (11).

### team_members
`id` PK · `name` · `email` · `role` · `createdAt`

### subtasks
`id` PK · `parentTaskId` → tasks(id) ON DELETE CASCADE · `title` · `completed` 0/1 · `sortOrder` · `createdAt` · `updatedAt`

### habits
`id` PK · `name` · `description` · `color` (default `#10B981`) · `frequency` JSON (`{"type":"daily"}`) · **`trackType`** (`duration|count`, default `duration`) · `isArchived` 0/1 · `sortOrder` · `createdAt`
Migrated in: `trackType` (`server/db.js:290-295`)
> `trackType` picks the unit a habit is logged in: `duration` uses `habit_entries.timeSpentSeconds`, `count` uses `habit_entries.count`. `POST` / `PUT /api/habits` persist it and accept **only** the two documented values — anything else falls back to `'duration'`, and a `PUT` that omits the field keeps the stored value (`server/routes/habits.js:6-12, 48-54, 73-80`). No CHECK constraint: validation lives in the route (ADR-011).
> **`frequency` is normalized at the API boundary — the client always receives an object.** `server/habitFrequency.js` exports the single dependency-free `normalizeFrequency(value)` (no imports, so a unit test can load it without opening the live DB), and `server/routes/habits.js` calls it at `:21` (read, inside `parseHabit`), `:52` (`POST`) and `:79` (`PUT`). Contract (ADR-012, design.md D2): a cell that was stored as a JSON *string* — or a nested one — is unwrapped (the cell plus at most two further `JSON.parse` passes, so 4+ layers degrade to daily instead of looping); `weekly` always carries a positive finite numeric `timesPerWeek` (default `1`, matching `frequency.timesPerWeek || 1` in `src/utils/habits.js:94, 205`; preserved unrounded and unclamped); `weekdays` always carries `days` (integers 1–7, deduplicated ascending, `[]` when nothing is usable — never an invented day); an unparsable cell, a non-object, or any `type` other than `daily`/`weekly`/`weekdays` (exact, case-sensitive) → `{type:'daily'}`. Keys the function does not own are copied through untouched. It is total (never throws) and idempotent, because `PUT` feeds an already-normalized value back in.
> **The write path is the only repair.** `PUT /api/habits/:id` rewrites whatever it read single-encoded, so a doubly-encoded row heals on the next save from the habit modal. There is deliberately **no boot-time `frequency` repair** in `server/db.js` (it still runs only the three rewrites in §2) and no repair migration was added — see §5 for the one live row this leaves in place.

### habit_entries
`id` PK · `habitId` → habits(id) ON DELETE CASCADE · `date` · `timeSpentSeconds` (default 0) · **`count`** (default 0) · `createdAt` · **`UNIQUE(habitId, date)`**
Migrated in: `count` (`server/db.js:296-301`)
> One entry per habit per day. A second POST for the same day returns **HTTP 409** `{"error":"Entry already exists for this habit and date"}` **without updating** (`server/routes/habitEntries.js:50-55`) — the correct write path is GET → DELETE (`/by-date?habitId=&date=`) → POST, or PUT the existing entry id.
> Both value columns are written by the same routes: `timeSpentSeconds` stays canonical for duration habits, `count` for rep habits (`server/routes/habitEntries.js:8-12, 39-47, 60-66`). Each is optional on READ; duration habits leave `count` at 0 and count habits leave `timeSpentSeconds` at 0. Migration defaults (0 / `'duration'`) cover every pre-existing row, so no historical row changed (ADR-011).

### weekly_objectives
`id` PK · `weekStart` · `objectives` JSON `'[]'` · `createdAt` · `updatedAt` · `UNIQUE(weekStart)`
> `objectives` is an array of `{text, completed}` — a legacy array-of-strings row is rewritten on boot by the data migration in `server/db.js:186-204`. Written by two clients: the planner panel (`WeeklyObjectives.jsx:239`) and the weekly review's "Write weekly goals to DayFrame" bridge, which **replaces** the planner's objectives (`WeeklyReview.jsx:512-528`).
> A `mode` column (`personal|work`) + `UNIQUE(weekStart, mode)` exists on the WORK-toggle branch — and **in the live DB** — but not in master's code (see §5 and DECISION_LOG ADR-009/ADR-010).

### weekly_reviews
`id` PK · `weekStart` · `cleanupTasks` JSON `'[]'` · `gratitudeEntries` JSON `'[]'` · `reflectionAnswers` JSON `'{}'` · `weeklyGoals` JSON `'[]'` · `syncFlags` JSON `'{}'` · `createdAt` · `updatedAt` · `UNIQUE(weekStart)`
> `syncFlags` carries `goalsSynced` / `goalsSyncedAt` / `keyEventsListed` (`WeeklyReview.jsx:803-827`). No DELETE endpoint.

### daily_notes
`id` PK · `date` · `highlights` · `rolledOverTaskIds` JSON `'[]'` · `createdAt` · `updatedAt` · `UNIQUE(date)`

### yearly_goals
`id` PK · `year` · `goals` **JSON array `[{text, completed}]`** · `images` JSON `'[]'` (base64 data URLs) · `createdAt` · `updatedAt` · `UNIQUE(year)`
Migrated in: `images` (`server/db.js:243-247`) · `vision` free text (`:255-260`)
> Corrected: `goals` is **not** rich text. It held a free-text string until `de928b5` (2026-03-18, "restructure YearlyGoals into vision textarea + goals checklist"); the migration in `server/db.js:262-281` moves any non-JSON-array `goals` value into `vision` and resets `goals` to `'[]'`. Today: `vision` = long-form text, `goals` = checklist of `{text, completed}` (`src/components/YearlyGoals.jsx:10, 90`).
> Gotcha: the **not-found default** returned by `GET /api/yearly-goals` hands back `goals`/`images` as *strings* (`'[]'`), while a persisted row returns the raw TEXT columns — the client `JSON.parse`s them itself (`yearlyGoals.js:18`, `YearlyGoals.jsx:29`).

### key_events
`id` PK · `title` · `date` · `description` · `category` · `createdAt` · `updatedAt` (rendered in the review tab's key-events grid **and** the planner's `WeeklyObjectives` grid; rendered twice with two independent UIs)

### workflow_steps / workflow_completions
`workflow_steps`: `id` · `text` · `sortOrder` · `createdAt`
`workflow_completions`: `id` · `stepId` → workflow_steps(id) ON DELETE CASCADE · `date` · `createdAt` · `UNIQUE(stepId, date)`
> `POST` on an existing `(stepId, date)` is treated as **success** (returns the existing row, HTTP 200) rather than a conflict — the opposite of `habit_entries` (`server/routes/workflowCompletions.js:25-29`).

### financial_cards
`id` PK · `name` · `institution` · `cardType` (default `credit`) · `accountNumber` · `displayOrder` · `active` 0/1 · `createdAt` · `updatedAt`
> **Seeded from a gitignored file — never from tracked source.** The first `GET /api/financial-cards` on an empty table seeds from the optional `data/seed-cards.json` (a JSON array of `{name, institution, cardType, accountNumber}`), read at request time by `readSeedCards()` (`server/routes/financialCards.js:15-30`). **If the file is absent, unreadable or not a JSON array, nothing is seeded** and the GET still returns `200` with `[]`; there is no fallback list in source (POL-006 — the GitHub repo is public). Once the table holds at least one row the file is never read again, so this is a **no-op for the live DB**, which is already seeded. Deactivate is a soft delete (`active = 0`); there is no DELETE route.

### monthly_reviews
`id` PK · `monthKey` (`YYYY-MM`) · `year` · `month` · `reviewDate` · `status` (`pending|in_progress|completed`) · `checklist` JSON `'[]'` · `cardEntries` JSON `'[]'` (per-card payment entries) · `notes` · `images` JSON `'[]'` (base64 photos, Phase 1 paste UI) · `completedAt` · `createdAt` · `updatedAt` · **`UNIQUE(monthKey)`**
Migrated in: `images` (`server/db.js:249-253`) · `notes` (`:283-287`)
> `checklist` items are `{id, key, text, section, order, completed, completedAt}` seeded from the 20-item template in `src/utils/checklistTemplate.js:11-57`; item ids use `crypto.randomUUID`, so they are stable per review but not across reviews. `cardEntries` items are `{cardId, cardName, cardInstitution, accountNumber, statementSaved, amount, dueDate, moneyProVerified, ppsSetUp, moneyProRecorded, notes}` and the PATCH allow-list is exactly those last 7 fields (`monthlyReviews.js:220`).
> `images` is stripped from `GET /api/monthly-reviews` (list) and carried only by `/current` and `/by-month`; `PATCH /:id/images` is the write path. `persistReview()` never touches `images`. Any month that is not the current month is read-only in the UI.

### settings
`key` PK · `value` (TEXT, JSON-encoded) · `updatedAt`
> Generic key/value store for app-level state. Only one key is in use today: `todayOrder` — the per-day task ordering array (`App.jsx:53, 205`; value seen live: `["400","378","374"]`). New app-level state should prefer this table over new tables when it is not relational.

## 2. Data migrations (not just column adds)

`server/db.js` runs **three** data rewrites at boot, in addition to the ALTERs. They are the reason a legacy DB keeps working — and they mean booting the server can mutate Anderson's rows:

| Migration | Location | Effect |
|---|---|---|
| `weekly_objectives.objectives`: array of strings → array of `{text, completed}` | `server/db.js:186-204` | rewrites rows whose first element is a string |
| `tasks.status`: `todo` / `in-progress` → `pending` | `server/db.js:207-210` | unconditional `UPDATE` on every boot |
| `yearly_goals`: free-text `goals` → `vision`, `goals` := `'[]'` | `server/db.js:262-281` | one-way; re-running is a no-op because `goals` is then a JSON array |

The **ALTER-only additions** (no data rewrite, defaults keep every existing row valid): `tasks.estimatedMinutes` / `sortOrder` / `startTime` / `endTime` / `scheduledTime` (`:213-241`) · `yearly_goals.images` (`:243-247`) · `monthly_reviews.images` (`:249-253`) · `yearly_goals.vision` (`:255-260`) · `monthly_reviews.notes` (`:283-287`) · **`habits.trackType` + `habit_entries.count`** (`:290-301`, added 2026-09-20 by `t_74db36be`). New migrations are appended at the **end** of the list so no earlier line number in this document shifts.

## 3. Requested entities that do NOT exist (gap note)

The team mandate listed "Workspaces, Projects, Activity Logs, Users". Reality in the schema:

| Requested | Actual | Note |
|---|---|---|
| Projects | `projects` | exists ✅ |
| Workspaces | *none* | DayFrame is single-user and single-DB; there is no workspace/tenant concept. Do not invent one without an owner decision. |
| Activity Logs | *none* | No audit trail table. `createdAt`/`updatedAt` timestamps are the only history. Adding an audit log is a product decision, not a refactor. |
| Users | `team_members` + `settings` | `team_members` is a lightweight assignee directory for tasks — **not** authentication or authorization. |

## 4. Migration policy (binding)

1. **Add-only and idempotent.** Every schema change is `ALTER TABLE … ADD COLUMN x … DEFAULT …` wrapped in `try/catch`; never `DROP`/recreate a table that holds Anderson's data.
2. **Default values required** for new columns so existing rows stay valid (`'[]'`, `'{}'`, `0`, `NULL`).
3. **UNIQUE constraints** cannot be added by ALTER — introducing one that already exists in `CREATE` requires a **table rebuild** that copies rows (this is what the parked WORK-toggle work did for `weekly_reviews` / `weekly_objectives`; the rebuilt DDL is in §5). A rebuild migration must (a) run once behind a column/shape check, (b) copy every row, (c) be rehearsed against a copy of `data/app.db` before it touches the live file.
4. **Data rewrites go in the same guarded style** as §2 and must be idempotent.
5. Verify with a real DB copy: boot a server against a legacy-shaped snapshot and confirm rows survive.

## 5. The live DB is ahead of the code (schema drift — read this before writing migrations)

`CREATE TABLE IF NOT EXISTS` never re-shapes an existing table, so the running `data/app.db` and a fresh clone's schema are **not** the same. Checked on 2026-09-20 with `sqlite3 data/app.db`:

- **17 tables, not 16**: the 16 above plus `google_calendar_tokens` (`id, accessToken, refreshToken, expiryDate, createdAt, updatedAt`). Nothing in this repo creates it — no `CREATE` in `server/`, no reference anywhere in `src/` or `server/` (grep: only `data/app.db` itself matches). It is an orphan left by an out-of-repo script; do not build on it without tracing its writer first.
- `weekly_reviews` and `weekly_objectives` **do have** `mode TEXT NOT NULL DEFAULT 'personal'`, `UNIQUE(weekStart, mode)` and `CHECK(mode IN ('personal','work'))` in the live DB — the WORK-toggle shape (ADR-009) — while master's `server/db.js` still declares `UNIQUE(weekStart)`. Because the tables already exist, master's `CREATE` is a no-op and the live columns survive.
- Consequence for planning: a card that says "the column does not exist" must say **where** it checked. Against the live DB, `mode` exists; against master's code, it does not. Both statements are true and neither is sufficient alone.
- **`habits.frequency` row id 9 (`Gym Session`) is double-encoded in the live DB** — the cell holds the text `"{\"type\":\"weekly\"}"` (a JSON *string* whose contents are the object), so `typeof(frequency)` is still `text` but the value needs **two** `JSON.parse` calls. A scan of every TEXT column of all 17 tables for values starting with `"` on 2026-09-20 found this to be the only such cell in the whole DB; every other `habits.frequency` cell holds a plain object. Identified read-only while building `fix-habit-frequency-normalization` and **deliberately left in place** (design.md D6 — repairing a row of Anderson's real data is his call, POL-001). It is no longer harmful: the API normalizes it on every read (§1) and it self-heals the next time the habit is saved through the UI, because that `PUT` rewrites the cell single-encoded. Verified after the change: live `data/app.db` byte-identical (md5 `edbebbf5c814b28d31ba61e5f2600ae0` before and after), `quote(frequency)` for row 9 still `'"{\"type\":\"weekly\"}"'`, `habits` 6 / `habit_entries` 397 / `tasks` 382 unchanged. The API-level reproduction used a `.backup` **copy** of this file, never the live one.
- **`habits.trackType` + `habit_entries.count` are now in the live DB too** — added 2026-09-20 by `t_74db36be` with the exact two guarded `ALTER`s the boot path runs (`server/db.js:290-301`), applied by hand (a consistent `.backup` of `data/app.db` was taken to `%LOCALAPPDATA%\Temp\app.db.pre-count-tracking.bak` first). Purely additive: `habit_entries` stayed at **394** rows, `habits` at **6**, `tasks` at **381**, `pragma integrity_check` → `ok`, and every existing row reads back `trackType='duration'` / `count=0`.

## 6. Habit count tracking — fixed 2026-09-20 (was inert)

The `habit-count-tracking` change (`fdc8e05`, archived under `openspec/changes/archive/2026-07-12-habit-count-tracking/`) added per-habit **count** tracking ("Push-ups 30 reps" instead of minutes) — but it originally **touched zero files under `server/`** (`git show --stat fdc8e05`: 18 files, all `openspec/`, `src/`), so for two months the feature was inert end-to-end:

- `habits` had **no `trackType` column** and the habit routes never read the field, so a habit saved as "Repetitions" came back as a duration habit and `getTrackType()` (`src/utils/habits.js:268-270`) always returned `'duration'`.
- `habit_entries` had **no `count` column** and the entry routes only read `timeSpentSeconds`, while the UI sends `count` (`src/components/HabitTracker.jsx:89, 112-120`, `src/components/PlannerHabitsPanel.jsx:66-80`) — the reps were silently discarded and the day was stored as 0, so every `entry.count` reader (`getEntryValue`, `HabitHeatmap`, `HabitTracker`, the weekly-review habit chips) read `undefined`.

**Fixed by `t_74db36be`** (branch `fix/habit-count-tracking-persistence`):

- `server/db.js:290-301` — two add-only guarded migrations: `habits.trackType TEXT NOT NULL DEFAULT 'duration'` and `habit_entries.count INTEGER NOT NULL DEFAULT 0`. No CHECK constraint and no table rebuild (§4.1); existing rows keep the defaults.
- `server/routes/habits.js:6-12, 45-51, 70-77` — `POST`/`PUT` persist `trackType`; a value outside `duration|count` falls back to `'duration'`, and a `PUT` that omits it keeps the stored value.
- `server/routes/habitEntries.js:8-12, 39-47, 60-66` — `POST`/`PUT` persist `count` (whole, non-negative; anything else stores 0) while `timeSpentSeconds` behaves exactly as before. `GET` responses carry both fields, so no response shape change beyond the columns.
- **No client change was needed** — the UI already sent and read both fields; the `UNIQUE(habitId, date)` 409 contract is unchanged.

Verification: a legacy-shaped **copy** of the live DB (the pre-migration backup) was booted with the new code — the two columns appeared, `habit_entries` stayed at 394 rows / `habits` at 6, and a 19-check API script passed (POST→GET→PUT round-trips for both fields, the duration path, an invalid `trackType`, and the duplicate-day 409). The live DB then received the same two `ALTER`s (§5) and the running old-code API stayed healthy (`GET /api/habits` → 200 with `trackType`).

## 7. How to update this document

Rule B: update this file in the same branch as any change that adds or alters a table, column, constraint or JSON blob shape. Cite the migration line in `server/db.js`. If you changed the live DB by hand or by an out-of-repo script, say so in §5.
