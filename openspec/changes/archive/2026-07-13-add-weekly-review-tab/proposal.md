## Why

Dayframe currently focuses on day-to-day execution (Today, Planner, Habits, Projects) but offers no structured weekly ritual for closing out the past week and setting up the next one. The user maintains a personal weekly review routine — miscellaneous cleanup, gratitude, reflection, and goal/key-event setup — that today lives outside the app in scattered checklists. Bringing this ritual into Dayframe as a dedicated tab keeps the weekly plan co-located with the calendar and habit data it references (e.g. "did I hit habit minimums last week?") and lets the review flow write directly back into the existing Weekly Goals and Key Events data.

## What Changes

- Add a new top-level **Review** tab in the sidebar (new `review` view alongside `today`, `planner`, `habits`, `projects`).
- Add a new `WeeklyReview` component rendering three sequential sections for the selected week:
  1. **Weekly Miscellaneous Cleanup** — a per-week checklist pre-populated from a default template (inbox/desktop/physical/outbox cleanup, device wipe, Kindle Economist download with link, weekly blueprint). Items are checkable, editable, and add/remove-able.
  2. **Weekly Gratitude** — a list to write down things you are grateful for (prompt targets 5 entries), with add/remove and free-form text.
  3. **Weekly Goal Setup** — (a) past-week reflection prompts (4 fixed questions with free-text answers, including a habit-minimum check that surfaces last week's habit completion), (b) up to 3 weekly goals each with a minimum viable next step, (c) two bridging action checkboxes: "Write weekly goals to DayFrame" (syncs the 3 goals into the existing weekly objectives) and "List this week's key events" (shows/adds key events for the week via the existing key events API).
- Add week navigation (prev / next / "This Week") defaulting to the current Monday–Sunday, so users can review any week.
- Add a new `weekly_reviews` SQLite table keyed by `weekStart` storing cleanup tasks, gratitude entries, reflection answers, weekly goals (with minimum steps), and sync flags.
- Add a new `weeklyReviewService` in `src/api.js` and a new Express route `server/routes/weeklyReviews.js` mounted at `/api/weekly-reviews` (GET by week, PUT upsert).
- Reuse existing `weeklyObjectiveService` and `keyEventService` for the bridging actions — no duplication of goals/events storage.

## Capabilities

### New Capabilities
- `weekly-review-planning`: A dedicated weekly review and planning view with three sections (cleanup checklist, gratitude list, reflection + goal setup), per-week persistence, week navigation, and bridging actions that sync goals into the existing weekly objectives and surface key events for the week.

### Modified Capabilities
- None. The review tab reads from and writes to existing `weekly_objectives` and `key_events` data via their current services/APIs, but does not change the spec-level requirements of those capabilities.

## Impact

- **New files**: `src/components/WeeklyReview.jsx`, `src/components/WeeklyReview.css`, `server/routes/weeklyReviews.js`, plus tests under `src/__tests__/`.
- **Modified files**:
  - `src/App.jsx` — import `WeeklyReview`, add `activeView === 'review'` branch, pass week/key-event/objective handlers.
  - `src/components/Sidebar.jsx` — add "Review" nav item with icon (e.g. `FaListCheck`) mapping to view `review`.
  - `src/api.js` — add `weeklyReviewService` (getByWeek, upsert).
  - `server/db.js` — add `weekly_reviews` table creation + migrations.
  - `server/index.js` — mount `/api/weekly-reviews` route.
- **Reused services**: `weeklyObjectiveService.upsert` (sync goals), `keyEventService` (list/add events), `habitEntryService` (surface last week's habit completion for the reflection prompt).
- **No breaking changes** to existing APIs or data models; new table is additive.
- **Dependencies**: No new npm packages — uses existing React, date-fns, react-icons, express, better-sqlite3.
