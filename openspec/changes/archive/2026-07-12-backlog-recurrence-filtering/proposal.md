## Why

Recurring source tasks currently appear in the backlog whenever they have any due date, even when their next instance is in the future. This clutters the "Unscheduled" backlog view with items the user has already implicitly scheduled via the recurrence pattern, making it harder to spot truly loose work. We want the backlog to surface recurring items only when they have actually fallen behind.

## What Changes

- Add a `getNextOccurrenceFrom(task, fromDate)` helper in `src/utils/recurrence.js` that returns the second occurrence of the recurrence pattern (one step after the first instance / `task.dueDate`), or `null` when the pattern has already ended by `fromDate` or has fewer than two instances. `fromDate` is the reference used to detect an ended pattern.
- Update `BacklogSidebar.jsx` so the "Unscheduled" view excludes recurring source tasks whose next instance is today or in the future. The source becomes visible (with the existing overdue badge) when the next instance is strictly before today.
- "All Pending" view behavior is unchanged — every pending task is still listed there.
- Non-recurring task filtering is unchanged.

## Capabilities

### New Capabilities
- `backlog-filtering`: Rules that decide which tasks the BacklogSidebar shows in each view mode ("All Pending" and "Unscheduled"), including the new recurrence-aware rule.

### Modified Capabilities
- None. The backlog does not yet have a spec, so this is a greenfield capability.

## Impact

- `src/utils/recurrence.js` — new pure helper
- `src/components/BacklogSidebar.jsx` — filter logic update
- `src/__tests__/recurrence.test.js` — tests for new helper
- `src/__tests__/BacklogSidebar.test.jsx` — new test file for the sidebar
- No database migration; no API change; no impact on calendar, day-column, or daily-planning views (they already expand recurring instances separately).
