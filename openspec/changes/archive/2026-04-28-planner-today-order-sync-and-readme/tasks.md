## 1. Today View → sortOrder sync

- [x] 1.1 In `App.jsx` `handleTodayOrderChange`, after saving `todayOrder` to settings, loop through the new order array and update `sortOrder` on each non-recurring task via `taskService.update()`
- [x] 1.2 Skip recurring instances (`task.isRecurringInstance === true`) when updating `sortOrder` — only update real task rows
- [x] 1.3 Verify the Today view reorder still works visually and persists after page reload

## 2. Planner → todayOrder sync

- [x] 2.1 In `DailyPlanner.jsx`, add `onTodayOrderChange` to the component props
- [x] 2.2 In the same-day reorder handler, after writing `sortOrder` to each task, check if `dateStr === toLocalDateStr(new Date())`
- [x] 2.3 If the reordered day is today, call `onTodayOrderChange` with the new ordered array of task ID strings
- [x] 2.4 Pass `onTodayOrderChange` prop from `App.jsx` to `DailyPlanner`
- [x] 2.5 Verify reordering today's tasks in the planner updates the Today view order

## 3. README Update

- [x] 3.1 Rewrite the Features section to include: Today View, Quick Capture, Daily Workflow, Daily Planner (week view), Habits, Backlog Sidebar, and Notifications
- [x] 3.2 Update the Data Persistence section to reflect the Node.js + SQLite backend (not IndexedDB)
- [x] 3.3 Update Installation & Setup to reflect `npm run dev` starting both frontend and backend (or the correct start command)
- [x] 3.4 Remove any outdated references (IndexedDB, Dexie, single offline app) that no longer apply

## 4. Tests & Verification

- [x] 4.1 Write unit test: `handleTodayOrderChange` calls `taskService.update` with correct `sortOrder` for non-recurring tasks
- [x] 4.2 Write unit test: `handleTodayOrderChange` skips recurring instance tasks
- [x] 4.3 Run `npm run test:run` and confirm all tests pass
- [x] 4.4 Run `npm run lint` and fix any new issues
