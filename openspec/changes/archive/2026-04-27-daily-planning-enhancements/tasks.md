## 1. Git Data Isolation

- [x] 1.1 Add `data/`, `*.export.json`, and `*.export.csv` patterns to `.gitignore`
- [x] 1.2 Verify no existing user data files are currently tracked by git (`git ls-files data/`)
- [x] 1.3 Document in change notes that developers should run `git rm --cached` on any tracked data files

## 2. Settings Table in IndexedDB

- [x] 2.1 Add a `settings` table to the Dexie schema in `src/db.js` (key-value: `{ key, value }`)
- [x] 2.2 Increment the Dexie schema version and add migration
- [x] 2.3 Add `settingsService` with `get(key)` and `set(key, value)` methods in `src/db.js`

## 3. Today View Item Reordering

- [x] 3.1 Add today-filtered task list with manual order state to `src/App.jsx` (load `todayOrder` from `settingsService` on mount)
- [x] 3.2 Create a `TodayView` component (or update existing today rendering) that accepts an ordered task list
- [x] 3.3 Implement native HTML5 drag-and-drop on task cards (`draggable`, `onDragOver`, `onDrop`)
- [x] 3.4 On drop, update order state in component and persist new order array to `settingsService.set('todayOrder', [...])`
- [x] 3.5 Add up/down arrow buttons on each task card as touch fallback; disable up on first item, down on last item
- [x] 3.6 Filter out stale task IDs (deleted/rescheduled) when loading stored order; append unordered today-tasks at bottom
- [x] 3.7 Write unit tests for the order merge/filter logic

## 4. Daily Planning Modal

- [x] 4.1 Create `src/components/DailyPlanningModal.jsx` with three sections: Overdue, Due Today, Upcoming (next 7 days)
- [x] 4.2 Fetch and group tasks by urgency in the modal (filter from all tasks passed as props)
- [x] 4.3 Render each task as a checkbox row; pre-check tasks already in `todayOrder`
- [x] 4.4 Implement "Start Day" confirm button: update `todayOrder` in state and `settingsService`, close modal
- [x] 4.5 Implement "Cancel" button: close modal with no state changes
- [x] 4.6 Add "Plan My Day" button to the app header in `src/App.jsx` (visible on all views)
- [x] 4.7 Wire modal open/close state in `src/App.jsx`
- [x] 4.8 Write unit tests for task grouping logic (overdue / due today / upcoming)

## 5. Verification

- [x] 5.1 Run `npm run test:run` and ensure all tests pass
- [x] 5.2 Run `npm run lint` and fix any issues
- [ ] 5.3 Manual smoke test: reorder Today tasks, reload, verify order is preserved
- [ ] 5.4 Manual smoke test: open Plan My Day, select tasks, confirm, verify Today view updates
- [ ] 5.5 Manual smoke test: create a `data/test.export.json` file and confirm `git status` does not list it
