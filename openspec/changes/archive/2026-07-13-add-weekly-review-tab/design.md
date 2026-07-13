## Context

Dayframe is a single-user, server-backed planning app (React 19 + Vite frontend, Express + better-sqlite3 backend). The frontend talks to REST endpoints via service objects in `src/api.js`. Views are switched by an `activeView` string in `App.jsx` (`today`, `planner`, `habits`, `projects`) with a `Sidebar.jsx` nav.

Existing weekly data the review tab must integrate with:
- `weekly_objectives` table — keyed by `weekStart`, stores `objectives` as JSON array of `{text, completed}`. Read/written by `weeklyObjectiveService` and rendered in the `WeeklyObjectives` panel inside `DailyPlanner`.
- `key_events` table — flat list with `date`, `title`, `category`, `description`. Read/written by `keyEventService`. The `WeeklyObjectives` panel groups them into Mon–Sun columns.
- `habit_entries` table — `{habitId, date, timeSpentSeconds}`. Read via `habitEntryService.getAll({from, to})` (route supports query params).

Week math convention across the app: Monday-start via `date-fns` `startOfWeek(..., { weekStartsOn: 1 })`; dates stored as `yyyy-MM-dd` strings.

## Goals / Non-Goals

**Goals:**
- Provide one dedicated **Review** tab that walks the user through the three-section weekly ritual (cleanup, gratitude, reflection + goal setup) for any selected week.
- Persist all review state per week so a half-finished review survives reloads.
- Bridge the review's goal output into the existing `weekly_objectives` data and surface/add key events for the week — reusing existing services, no second source of truth for goals/events shown in the Planner.
- Surface last week's habit completion as read-only context for the habit reflection prompt.

**Non-Goals:**
- Globally customizable cleanup/gratitude/reflection templates (the default templates are code constants; per-week edits are stored, but there is no settings UI to edit the *template*).
- Auto-syncing goals to the planner (sync is a deliberate manual action with confirm).
- Enforcing exactly 5 gratitude entries or exactly 3 goals (the UI hints at these numbers but does not hard-block more/fewer).
- Mobile-specific redesign beyond the existing responsive sidebar behavior.
- Changing the `WeeklyObjectives` panel contract or the `weekly_objectives` JSON shape.

## Decisions

### 1. Separate `weekly_reviews` table vs extending `weekly_objectives
**Decision:** Add a new `weekly_reviews` table keyed by `weekStart`, storing `cleanupTasks`, `gratitudeEntries`, `reflectionAnswers`, `weeklyGoals`, and `syncFlags` as JSON TEXT columns.
**Rationale:** The review document is structurally richer than the planner's `{text, completed}` objectives list. Embedding it in `weekly_objectives` would couple two independent concerns and force the `WeeklyObjectives` panel to parse/ignore unfamiliar fields, risking regressions. A separate table is purely additive and keeps the existing capability untouched.
**Alternatives considered:** (a) Add a `reviewBlob` column to `weekly_objectives` — rejected for the coupling reason above. (b) Store review data in the generic `settings` table keyed by `review:<weekStart>` — rejected because it bypasses typed upsert semantics and makes week-keyed queries awkward.

### 2. Goal sync strategy — copy text into `weekly_objectives`
**Decision:** The "Write weekly goals to DayFrame" bridging action calls `weeklyObjectiveService.upsert(weekStart, [{text, completed:false}, ...])` using the **text** of each review goal (minimum step stays in `weekly_reviews` only). It replaces the week's existing objectives after a confirm dialog. A `syncFlags.goalsSynced` flag is set to reflect the checkbox state.
**Rationale:** The planner panel renders `{text, completed}`; we must not change that contract. The review is the *planning* source; the planner is the *execution/completion* source. Text-only sync keeps the two roles clean. If the user later edits objectives in the planner, the review keeps the original intent — acceptable and expected.
**Alternatives considered:** (a) Share one dataset (review goals === weekly objectives) — rejected, would force the planner panel to render minimum-step fields. (b) Merge instead of replace — rejected, ambiguous and hard to undo; replace-with-confirm is predictable.

### 3. Cleanup template as a code constant, seeded per week
**Decision:** Define `DEFAULT_CLEANUP_TEMPLATE` (array of `{text, link?}`) as a constant in `WeeklyReview.jsx`. When loading a week that has no stored `cleanupTasks`, seed the in-component state from the constant and persist on first edit (or on first load). Per-week add/edit/remove thereafter.
**Rationale:** Matches the user's fixed personal routine; no settings UI needed now. Seeding per week gives a fresh checklist every week while allowing one-off edits.
**Alternatives considered:** Store the template in `settings` for global editability — deferred (non-goal); can be added later without schema change by reading a settings key on seed.

### 4. Week navigation local to the component
**Decision:** `WeeklyReview` holds local `weekStartDate` state (default `startOfWeek(new Date(), {weekStartsOn:1})`) with Prev / Next / "This Week" controls, mirroring `DailyPlanner`'s pattern. The `weekStart` string (`yyyy-MM-dd`) is the key for all loads/saves.
**Rationale:** Consistent with existing week math; keeps the review tab self-contained rather than coupling to the planner's selected week.
**Alternatives considered:** Share the planner's selected week via App state — rejected, the two views are navigated independently and users may review a different week than the one open in the planner.

### 5. Habit completion summary for the reflection prompt
**Decision:** For the habit reflection question, render a read-only "Last week's habits" helper that loads habit entries for Mon–Sun of the selected week via `habitEntryService.getAll({from, to})` and shows per-habit check counts. The answer itself is a free-text field stored in `reflectionAnswers.habits`.
**Rationale:** Gives the user the context the prompt references ("參考DAY FRAME") without building a full habits dashboard inside the review.
**Alternatives considered:** Link to the Habits tab only — rejected, the user explicitly wants the data surfaced during reflection.

### 6. Persistence pattern — optimistic local state + upsert on mutation
**Decision:** Follow the `WeeklyObjectives` pattern: keep review state in local React state, call `weeklyReviewService.upsert(weekStart, fullDocument)` on each mutating action. GET on week change.
**Rationale:** Matches the established codebase pattern; simple and good enough for a single user. No realtime/multi-user concerns.
**Alternatives considered:** Debounced autosave — slightly nicer but adds complexity; can be layered later without API change.

### 7. API shape
**Decision:** `GET /api/weekly-reviews?weekStart=YYYY-MM-DD` → returns the document (or zeroed defaults `{weekStart, cleanupTasks:[], gratitudeEntries:[], reflectionAnswers:{}, weeklyGoals:[], syncFlags:{}}` when none exists). `PUT /api/weekly-reviews` → upsert by `weekStart`, accepts the full document body.
**Rationale:** Mirrors `weeklyObjectives.js` route exactly, keeping the backend uniform.
**Data model:**
```sql
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekStart TEXT NOT NULL,
  cleanupTasks TEXT NOT NULL DEFAULT '[]',      -- [{id, text, completed, link?}]
  gratitudeEntries TEXT NOT NULL DEFAULT '[]',   -- [string]
  reflectionAnswers TEXT NOT NULL DEFAULT '{}',  -- {goalsCompleted, obstacles, energy, habits}
  weeklyGoals TEXT NOT NULL DEFAULT '[]',        -- [{text, minimumStep, completed}]
  syncFlags TEXT NOT NULL DEFAULT '{}',          -- {goalsSynced, keyEventsListed}
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(weekStart)
);
```

## Risks / Trade-offs

- **Sync overwrites user-edited planner goals** → Sync is a manual action with a confirm dialog; if `weekly_objectives` already has objectives for the week, the dialog shows how many will be replaced. `syncFlags.goalsSynced` is per-week so the user can see whether this week's goals were already pushed.
- **Default template drift / user wants different cleanup items** → Per-week items are editable after seeding; a future settings-based template is a non-goal now but the JSON shape already supports arbitrary items.
- **Two sources of truth for weekly goals (review intent vs planner execution)** → Accepted by design (planning vs execution roles). The review always shows the *planned* goals/minimum steps; the planner shows *tracked* objectives. Documented in the UI hint near the sync action.
- **Habit summary fetch latency on week change** → Load habit entries in parallel with the review document via `Promise.all`; render the summary lazily so it doesn't block the rest of the tab.
- **Large per-week JSON** → Negligible for a single user (kilobytes); SQLite TEXT column is fine.

## Migration Plan

1. **Backend**: Add `weekly_reviews` table via `CREATE TABLE IF NOT EXISTS` in `server/db.js` (idempotent — no version bump needed). Add `server/routes/weeklyReviews.js` and mount at `/api/weekly-reviews` in `server/index.js`.
2. **Frontend**: Add `weeklyReviewService` to `src/api.js`, then `WeeklyReview.jsx/.css`, wire into `Sidebar.jsx` and `App.jsx`.
3. **No data migration**: New table only; existing data untouched.
4. **Rollback**: Remove the sidebar entry + `App.jsx` branch to hide the feature; drop the `weekly_reviews` table and route. No other data is affected since sync writes to `weekly_objectives` only on explicit user action.

## Open Questions

- **Gratitude structure**: free list vs exactly-5 slots? → Resolved as free list with an "aim for 5" hint (non-blocking), to avoid rigid UI.
- **Reflection questions editable?** → Resolved as fixed template for now (non-goal to make them editable); questions live as a constant in the component.
- **Should key-events bridging also let you *add* events, or only list them?** → Resolved: both list and add, reusing `keyEventService` + the existing `onAddKeyEvent` handler from `App.jsx`, so the review tab can stand alone for weekly planning.
