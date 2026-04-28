## Why

The Daily Planner and the Today view each maintain their own independent task ordering — the planner uses a `sortOrder` field on tasks while Today view uses a separate `todayOrder` settings array. When a user reorders tasks in one view, the other view is unaffected, creating confusion when the same task appears in a different position depending on which view you're looking at. The README also no longer reflects the app's current feature set (missing Today view, Daily Workflow, Quick Capture, and other recent additions).

## What Changes

- When the user reorders tasks in the Today view, the corresponding `sortOrder` on each task SHALL be updated to match, keeping the planner's today column in sync
- When the user reorders tasks in the planner (drag-and-drop within a day), if the affected day is today, the `todayOrder` settings array SHALL be updated to match
- The README is updated to accurately describe all current features including Today view, Quick Capture, Daily Workflow, Daily Planner, habits, and the Node.js/SQLite backend

## Capabilities

### New Capabilities

- `planner-today-order-sync`: Bidirectional sync of task order between the Today view and the Daily Planner's today column

### Modified Capabilities

- `today-item-ordering`: Order changes made in the Today view now also update `sortOrder` on tasks (and vice versa from planner)

## Impact

- `src/App.jsx` — `handleTodayOrderChange` needs to also update `sortOrder` on each task
- `src/components/DailyPlanner.jsx` — same-day reorder handler needs to also update `todayOrder` settings when the day is today
- `README.md` — full rewrite to reflect current feature set
- No schema changes required
