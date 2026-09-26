# DayFrame — Route Map

Owner: `df-lead` · Last updated: 2026-09-26 (v1.3 — §1 revised by card `t_7fd24929`, stage 3 of `ui-modernization-calm-canvas`: rows on Today / the Week day columns / the backlog, focus-reachable row actions, one-click habit logging and the Radix popover + tooltip owners; v1.2 — §1 revised by card `t_aa4715eb`, stage 0 of `ui-modernization-calm-canvas`: the four dead components and their stylesheets are deleted; every verb, mount and period parameter still re-checked against `src/App.jsx`, `src/components/Sidebar.jsx`, `server/index.js`, `server/routes/*.js` @ `master` `526f3b3`)

## 1. UI surfaces

There is **no client-side router**. `App.jsx` holds `activeView` and renders one view at a time inside one shared shell: `TopStrip.jsx` is the 52px strip that switches the view and `CaptureLine.jsx` is the shell's single capture line, present on every view (`src/App.jsx` mounts both in `.app-chrome`). `activeView` defaults to **`today`** — Today is the cold open (`src/App.jsx:41`).

**Stage 2 of `ui-modernization-calm-canvas` (ADR-012)** replaced the 220px rail (`Sidebar.jsx`/`.css`, now `TopStrip.jsx`/`.css`) with the strip: four text destinations (Today · Week · Habits · Review) plus a **"More" overflow** built on `@radix-ui/react-dropdown-menu` holding Finance · Projects · Backup · Notifications. That also closes the audit's F16 mobile dead end — the old rail was `display: none` below 768px (`Sidebar.css:93-98`), while the strip is one responsive row that wraps and keeps all six views reachable at 1440 / 768 / 420px.

**Stage 3 of `ui-modernization-calm-canvas` (ADR-012)** turns the list surfaces into rows: Today, the Week view's day columns and the backlog render one hairline-separated line per entry (title at body size, right-aligned muted metadata) with no card fill, colour stripe or shadow, and every row action (move up/down, defer, edit) is reachable by keyboard focus and by touch — the actions appear on `:focus-within` as well as `:hover`, and are always visible where `@media (hover: none)` matches, so no row action depends on hover alone (F10). Popovers in these surfaces are Radix: `TimePopover`, `RepsPopover`, `DeferPopover` and the heat-map popover render through `RadixPopover.jsx` (viewport clamping, portal, Escape and outside dismissal), and icon-only actions use `TooltipButton.jsx`. Logging a habit is one action: a single activation on a not-done row writes the day with zero minutes and the duration is an optional in-place refinement (PUT), never a second POST (ADR-008's 409).

| View (`activeView`) | Component | What it is |
|---|---|---|
| `today` | `TodayView.jsx` (+ `DailyTimeline`, `PlannerHabitsPanel`, `DeferPopover`, `UndoToast`) | Today's tasks **as hairline-separated rows** (stage 3: one line per task, a completion circle, the title at body size, right-aligned muted metadata), overdue pull-to-today, per-day ordering (`todayOrder`), a 5-second undo for complete / defer / reorder, today's habits (collapsed to one "N of M done" line until activated) + daily workflow. **Quick capture is no longer here** — it is the shell's `CaptureLine.jsx` (stage 2), which writes `dueDate = today` and lands in this list |
| `planner` | `DailyPlanner.jsx` (+ `MiniWeekBar`, 7× `DayColumn`, `BacklogSidebar`, `YearlyGoals`, `WeeklyObjectives`) | Week/day time-block planner; the day columns and the backlog render rows too (stage 3); yearly goals; weekly objectives + a key-events day grid. An App-level toolbar (`App.jsx:346-375`) adds New Task / New Project / Total-Done-Pending stats |
| `habits` | `HabitTracker.jsx` (+ `HabitHeatmap`, `HabitModal`, `TimePopover`, `RepsPopover`) | Habit list with streak counts, heatmap, per-day logging. One activation on a not-done habit writes the day with zero minutes; each row owns its own value field for the duration/reps refinement (the shared minutes input is gone, F23). Fetches its own data (no props from `App.jsx`); `GET /api/habits` returns non-archived habits only |
| `projects` | `ProjectsView.jsx` | Projects: list + create / edit / delete (props only, no child components). The backlog lives in the **planner**, not here (`BacklogSidebar` is a child of `DailyPlanner`) |
| `review` | `WeeklyReview.jsx` | Weekly review + planning in 3 sections (Weekly Miscellaneous Cleanup · Weekly Gratitude · Weekly Goal Setup incl. reflection prompts, goal list and the key-events day grid). No child components. |
| `finance` | `MonthlyReview.jsx` (+ `FinancialCards`) | Monthly finance review: checklist, per-card payment entries, notes, photos (paste), reference panel |

Modals / popovers and **who actually renders them** (verified by the import graph):

| Component | Owner |
|---|---|
| `TaskModal`, `ProjectModal` | `App.jsx:429-457` |
| `HabitModal` | `HabitTracker.jsx:5` |
| `DeferPopover` | `TodayView.jsx` — rendered per row inside `.tv-row-actions`, with the row's "Defer" text action as its Radix trigger |
| `TimePopover`, `RepsPopover` | `HabitTracker` (heat-map cells), `PlannerHabitsPanel` (`HabitHeatmap` cells + the rail's per-row Time/Reps refinement) |
| `RadixPopover` | the one popover shell (stage 3): every popover above renders through it, so Radix owns the anchor, the portal and the viewport clamping |
| `TooltipButton` | the icon-only row actions in `TodayView`, `DayColumn`, `HabitTracker`, `HabitHeatmap` — the tooltip replaces `title=`, `aria-label` stays the accessible name |
| `UndoToast` | `TodayView` — the single 5-second undo for complete / defer / reorder (the habit-delete toast in `HabitTracker` is separate and untouched) |
| `RichTextEditor` | `TaskModal`, `YearlyGoals` |

**Deleted in stage 0 of `ui-modernization-calm-canvas` (ADR-012; card `t_aa4715eb`, branch `feat/ui-s0-dead-code`):** `Calendar.jsx`/`.css`, `DayPanel.jsx`/`.css`, `OutstandingTasks.jsx`/`.css`, `DailyShutdown.jsx`/`.css` — four components and 1,828 lines of CSS, imported by no live component. `DailyShutdown` is **deleted, not revived** (`design.md` §4/D8): `/api/daily-notes` and its rows are untouched (see §2) and the audit's F42 close-out ritual stays an open item.

Removed: the "Plan My Day" button + `DailyPlanningModal` (commit `dc6869b`, ADR-006).

**Shell elements added in stage 2 of `ui-modernization-calm-canvas` (ADR-012):** `TopStrip.jsx`/`.css` (mounted by `App.jsx`, the 52px strip plus its Radix "More" menu) and `CaptureLine.jsx`/`.css` (mounted by `App.jsx` directly under the strip, so it is a shell element rather than a Today element). `CaptureLine` owns the whole quick-capture contract that used to live in `TodayView.jsx` — create with `dueDate` = today's Hong Kong date computed at run time and `status: 'pending'`, clear on Enter, clear on Escape, ignore empty input, no reload — plus the `/` focus key (any view; it does not fire while a text field, the rich-text editor or an open dialog has focus) and the D9 preference `localStorage['dayframe.captureDefaults']` = `{"projectId": <number|null>, "priority": "low"|"medium"|"high"}`, read on capture and written whenever a capture or an edit sets either value (`src/components/captureDefaults.js` is the single owner of that key). It is **client-only**: no API, schema or settings row was added.

## 2. REST API

Base `http://localhost:3001/api` · JSON in/out · **no auth** (local single-user app) · `express.json({ limit: '50mb' })` for base64 images (`server/index.js:25`) · **no CORS middleware** (same-origin in dev via the Vite proxy and in prod via the Express static host). Routers are mounted in `server/index.js:28-43`; each file lives in `server/routes/`.

| Mount | Verbs | Notes |
|---|---|---|
| `/api/tasks` | `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` | `isRecurring` + `recurrencePattern` (JSON **object**); `sortOrder`, `startTime`, `endTime`, `scheduledTime`, `estimatedMinutes`. No period filter — the whole table is always returned. `POST` defaults `status` to **`'todo'`** when the body omits it (`tasks.js:49`) — see DATA_MODEL §1 |
| `/api/projects` | `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` | `DELETE` nulls `tasks.projectId` via the FK `ON DELETE SET NULL` + `PRAGMA foreign_keys = ON` (`server/db.js:12, 39`) — the route itself does not touch tasks |
| `/api/team-members` | full CRUD | assignee directory only (no auth) |
| `/api/subtasks` | `GET /` · `GET /by-task/:taskId` · `POST /` · `PUT /:id` · `PUT /:id/toggle` · `DELETE /:id` · `DELETE /by-task/:taskId` | cascade with parent task; `PUT /:id/toggle` is the checkbox path |
| `/api/habits` | `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` | `frequency` JSON; archive via `isArchived`; `GET /` accepts `?includeArchived=1` (default: non-archived only, `ORDER BY sortOrder`) |
| `/api/habit-entries` | `GET /` · `GET /by-habit/:habitId` · `POST /` · `PUT /:id` · `DELETE /by-date` · `DELETE /:id` | filters `?habitId=&from=&to=` (each optional, `ORDER BY date`); **UNIQUE(habitId, date)** — POST on an existing day returns **409** `{"error":"Entry already exists for this habit and date"}` **without writing**; correct path = GET → `DELETE /by-date?habitId=&date=` → POST, or PUT the existing id |
| `/api/weekly-objectives` | `GET /` · `PUT /` | `?weekStart=YYYY-MM-DD`; without it → latest 12 rows. `GET` for a missing week returns an **unsaved** `{weekStart, objectives: []}`; `PUT` requires `weekStart` + an `objectives` **array** (else 400) |
| `/api/weekly-reviews` | `GET /` · `PUT /` | `?weekStart=`; without it → latest 12 rows. `GET` for a missing week returns an **unsaved** default document; `PUT` requires `weekStart` and upserts `cleanupTasks`, `gratitudeEntries`, `reflectionAnswers`, `weeklyGoals`, `syncFlags`; **no DELETE endpoint** — clear by PUTting empty values |
| `/api/daily-notes` | `GET /` · `PUT /` | `?date=YYYY-MM-DD`; without it → latest 30 rows; missing date returns an unsaved `{date, highlights:'', rolledOverTaskIds: []}`; one doc per date (`UNIQUE(date)`) |
| `/api/yearly-goals` | `GET /` · `PUT /` | `?year=` is **mandatory** (400 otherwise, non-numeric 400); missing row returns an unsaved `{year, vision:'', goals:'[]', images:'[]'}` where `goals`/`images` are JSON **strings**; `PUT` accepts `goals`/`images` as array or string |
| `/api/key-events` | `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` | `GET /` accepts `?from=&to=` (both required together) else returns all, `ORDER BY date ASC`; `POST`/`PUT` require a non-empty `title` |
| `/api/workflow-steps` | `GET /` · `POST /` · `PUT /:id` · `DELETE /:id` | ordered checklist definitions |
| `/api/workflow-completions` | `GET /` · `POST /` · `DELETE /` | `GET` **requires** `?date=` (400 without); `POST` on an existing `(stepId, date)` returns **200 with the existing row** (idempotent, unlike habit-entries); `DELETE ?stepId=&date=` |
| `/api/financial-cards` | `GET /` · `GET /:id` · `POST /` · `PUT /:id` · `POST /:id/deactivate` · `POST /:id/reorder` | `GET /` **seeds from the optional gitignored `data/seed-cards.json` when the table is empty** (`financialCards.js:15-30`) — absent/unreadable/non-array file ⇒ nothing is seeded (no in-source list; POL-006); `reorder` body `{direction:'up'|'down'}` swaps `displayOrder` with the neighbour; `deactivate` is a soft delete (`active=0`); no DELETE route |
| `/api/monthly-reviews` | `GET /` · `GET /current` · `GET /by-month` · `POST /` · `PUT /` · `PATCH /:id/checklist/:itemId` · `PATCH /:id/card-entry/:cardId` · `PATCH /:id/notes` · `PATCH /:id/images` · `POST /:id/complete` · `POST /:id/reopen` · `POST /:id/sync-cards` | **`GET /` strips `images`**; `GET /current` is a **get-or-create** (it persists the month's review from the template on first read); `GET /by-month?monthKey=` returns an unsaved default when absent; `POST /` = 201, or **409** if the month exists; `PATCH /:id/card-entry/:cardId` only accepts the 7 documented fields; `PATCH /:id/images` requires an array of strings and bumps `pending → in_progress` when non-empty; `POST /:id/sync-cards` re-aligns `cardEntries` with the active cards, preserving existing values. No DELETE route |
| `/api/settings` | `GET /:key` · `PUT /:key` | generic key/value; `GET` returns `{key, value}` (JSON-parsed, `null` when unset), `PUT` takes `{value}`. Holds `todayOrder` (shared by TodayView + DailyPlanner) |

Non-API routes: in production `express.static(dist)` + `GET *` → `dist/index.html` (`server/index.js:46-52`); in dev Vite proxies `/api` → `:3001` (`vite.config.js:7-14`).

## 3. Conventions

- **Period parameters are explicit**: `?weekStart=YYYY-MM-DD` (week, Monday-start), `?from=&to=` (habit entries, key events), `?date=` (daily notes, workflow completions), `?monthKey=YYYY-MM` (finance), `?year=` (yearly goals). Never infer "the current period" silently — the caller says which period it wants.
- **A missing period is not an error**: the read endpoints return an in-memory default document rather than 404. The one exception is `GET /api/monthly-reviews/current`, which **creates** the row. Anything that assumes a "GET is read-only" contract is wrong here.
- **Dates are `YYYY-MM-DD` strings, Hong Kong time.** No server-side "today" assumptions in period math; the server's only date logic is `getLastSaturdayOfMonth` / `currentMonthKey` from the shared `src/utils/lastSaturday.js`.
- **Validation errors** return HTTP 400 with `{"error": "…"}`; unknown ids return 404; duplicate `monthKey` and duplicate habit entry return **409**. `mode` values outside `personal|work` are rejected with 400 on the WORK-toggle branch.
- **List endpoints must not ship base64 blobs.** When adding an image field, strip it from list responses and expose it on detail endpoints only (`monthlyReviews.js:29-33`).
- **Real-world identifiers never live in tracked source.** Seed/reference data that carries account numbers goes in a gitignored file under `data/` (`data/seed-cards.json` for cards), read at runtime; the endpoint must behave correctly when that file is missing (POL-006 — the GitHub repo is public).
- **No DELETE for document tables** (`weekly_reviews`, `weekly_objectives`, `monthly_reviews`, `yearly_goals`, `daily_notes`): clear content by upserting an empty document.
- **Two key-event UIs exist** — the review view's day grid and the planner's `WeeklyObjectives` grid — both writing `/api/key-events`. A change to key events must be checked in both.

## 4. How to update this document

Rule B: any new/changed endpoint, view or modal must be reflected here in the same branch — mount path, verbs, and the period parameter it takes. Note which component *renders* a modal, not just that it exists.
