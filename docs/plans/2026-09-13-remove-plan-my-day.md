# Remove "Plan My Day" (Exploration & Decision Doc)

Task: t_f8774aaa · Repo: C:\git\project_mgmt_tool (DayFrame) · Date: 2026-09-13
Status: exploration only — no code written, nothing committed. Ready for openspec proposal as the next step.

## Decision

Remove the "Plan My Day" feature entirely: the always-visible header button, the
`DailyPlanningModal`, its handler/state in `App.jsx`, its styles, its
utility + test, and the README section. Not hidden — deleted. The Today view,
its drag-and-drop ordering, Daily Workflow, and quick-capture all STAY.

## Current state (verified in repo)

- `src/App.jsx`
  - L8 import `DailyPlanningModal`; L16 `FaCalendarCheck` icon import (used only by the button).
  - L40 state `showPlanningModal`.
  - L215-220 `handlePlanningConfirm(newOrder)` → saves order via
    `handleTodayOrderChange`, closes modal, `setActiveView('today')`.
  - L338-345 `.plan-my-day-btn` button (always visible, above all views).
  - L464-472 modal render `{showPlanningModal && <DailyPlanningModal ... />}`.
- `src/components/DailyPlanningModal.jsx` (126 lines): groups pending tasks into
  Overdue / Due Today / Upcoming (next 7 days) via
  `utils/planningGroups.js`; user ticks tasks; "Start Day" writes a new
  `todayOrder` array and navigates to Today view.
- `src/components/DailyPlanningModal.css` (224 lines): all `.dpm-*` styles.
- `src/utils/planningGroups.js`: `groupTasksByUrgency(tasks, today)`.
- `src/App.css` L337-361: `.plan-my-day-btn` + `:hover`.
- `README.md` L40-44: "### Plan My Day" section.
- `openspec/specs/daily-planning-session/spec.md`: current spec for the feature
  (button + modal requirements; also contains a redundant sentence about
  quick-capture / Daily Workflow in the Today view).
- Archived OpenSpec change `openspec/changes/archive/2026-04-27-daily-planning-enhancements/`
  + `2026-04-28-today-view-quick-capture-and-workflow/` reference the feature —
  historical record, left untouched.

Entry points: ONLY the header button. No sidebar item, no keyboard shortcut
(no `keydown`/`KeyboardEvent` handlers reference planning anywhere in src).

## Dependency analysis — what actually depends on what

Critical distinction: the MODAL is a writer of `todayOrder`; it is NOT the only
writer and NOT a required path.

- `todayOrder` (loaded from `settingsService.get('todayOrder')`) is core app
  state used by:
  - `TodayView.jsx` (`mergeOrder(todayOrder, pending)` at L94, drag/arrow
    reorder via `onTodayOrderChange`),
  - `DailyPlanner.jsx` (same-day reorder of today's column syncs
    `onTodayOrderChange` at L99-103),
  - `handleTodayOrderChange` → persists to settings + `syncSortOrderFromTodayOrder`
    (`utils/syncTodayOrder.js`), keeping Today view and Planner today column in sync.
- Removing the modal leaves all of the above functional. If `todayOrder` is
  empty, `mergeOrder` falls back to all pending tasks in due-date order — no
  crash, no empty Today view.
- No other flow (TodayView / DailyShutdown / Backlog / OutstandingTasks /
  HabitTracker / Calendar) references `DailyPlanningModal` or "Plan My Day".
- Navigation to Today view after removal: `Sidebar.jsx` already has a "Today"
  nav item (`onNavigate('today')`), so the modal's `setActiveView('today')`
  convenience is not needed.
- Server/API: `todayOrder` is a generic settings key via `settingsService`
  (no dedicated endpoint). Zero matches for planning/todayOrder in `server/`.
  No backend change required.

## Removal scope (files/sections to delete)

1. `src/App.jsx`
   - Remove `import DailyPlanningModal from './components/DailyPlanningModal';` (L8).
   - Remove `FaCalendarCheck` from the react-icons import (L16).
   - Remove `const [showPlanningModal, setShowPlanningModal] = useState(false);` (L40).
   - Remove `handlePlanningConfirm` (L215-220).
   - Remove the button block (L338-345).
   - Remove the modal render block (L464-472).
2. Delete `src/components/DailyPlanningModal.jsx`.
3. Delete `src/components/DailyPlanningModal.css`.
4. Delete `src/utils/planningGroups.js` — dead after removal (only consumer is
   the modal).
5. Delete `src/__tests__/DailyPlanningModal.test.js` — tests only
   `groupTasksByUrgency` (8 cases), not the modal itself.
6. `src/App.css` — remove the "Plan My Day button" block (L337-361).
7. `README.md` — remove the "### Plan My Day" section (L40-44).
8. OpenSpec (in the proposal step, not now):
   - Delete `openspec/specs/daily-planning-session/` entirely — its only unique
     content is the button/modal requirements. Its one redundant sentence about
     Today-view quick-capture + Daily Workflow is fully covered by the dedicated
     `today-quick-capture/` and `daily-workflow-session/` specs.
   - Archive dirs stay as-is (historical record).

## What MUST stay (do not touch)

- `todayOrder` state, `handleTodayOrderChange`, `settingsService 'todayOrder'`,
  `utils/syncTodayOrder.js`, `utils/todayOrder.js` (`mergeOrder`) — core Today
  view ordering (spec `today-item-ordering/` + `planner-today-order-sync/`).
- `TodayView.jsx`, `DailyPlanner.jsx`, `PlannerHabitsPanel.jsx`, `DailyShutdown.jsx`,
  `BacklogSidebar.jsx`, `OutstandingTasks.jsx`, quick-capture, Daily Workflow —
  planner/Today flows are separate features, unaffected.

## Risks / breakage analysis

- Today view keeps working; empty `todayOrder` degrades gracefully.
- DailyPlanner reorder sync and Today view reorder keep persisting order —
  independent of the modal.
- No tests currently render the modal (App.test.jsx only checks header + stat
  cards; DailyPlanningModal.test.js tests the util only), so removing the modal
  does not break existing tests; DailyPlanningModal.test.js is deleted with it.
- Repo hygiene: master has uncommitted in-flight work on Weekly Review mode
  (WeeklyReview*.jsx, server/*, src/api.js). This removal touches App.jsx /
  App.css only — no file overlap with the in-flight work, so no merge hotspot.
- `todayOrder` data already stored in the DB is harmless leftover; leave it
  (Today view still reads it). Optional cleanup (deleting the settings key) is
  not needed for the feature removal.

## Verification plan (for the build step)

1. `npm run test:run` — all remaining tests pass (expect 8 fewer cases after
   deleting DailyPlanningModal.test.js).
2. `npm run build` — Vite build clean; confirm no dangling imports.
3. Manual smoke: app loads on planner view; sidebar Today nav still opens Today
   view with quick-capture + Daily Workflow; drag-reorder in Today and Planner
   today column still persists on reload; no "Plan My Day" button/modal anywhere.

## Follow-up (next step — do NOT do in this explore task)

Create an OpenSpec proposal (slug e.g. `remove-plan-my-day`) per the dev
pipeline: proposal.md (why/what), delta spec deleting
`specs/daily-planning-session/`, tasks.md with the file list above, then route
to `dev-builder` and `dev-reviewer` on the board after human approval.