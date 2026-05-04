## Why

The Today view currently requires users to manually reschedule overdue tasks one by one, and the Planner view's "go to today" orange circle button loses its position after navigation — both creating unnecessary friction in the daily workflow.

## What Changes

- Add a "Pull to Today" action in the Today view's Overdue section that moves all overdue tasks to today's date in one click
- Fix the Planner view so the orange circle (today indicator/nav button) always scrolls/navigates to the current day, regardless of the user's current scroll position or selected date

## Capabilities

### New Capabilities
- `overdue-pull-to-today`: Bulk action to move all overdue tasks into today's date from the Today view

### Modified Capabilities
- `planner-today-order-sync`: Orange circle button in Planner view now always navigates to the actual current day (today), not a relative or previously-selected position

## Impact

- `src/components/` — Today view component (Overdue section UI + handler), Planner/Calendar component (today button behavior)
- `src/db.js` — `taskService.update()` called for each overdue task when pulling to today
- No schema changes needed; no breaking changes
