## Why

The DailyWorkflow checklist currently sits in the center tasks column of the Today tab, visually disconnected from the habits panel. Since the workflow is conceptually a set of daily habits/routines, grouping it under the habits panel (left column) creates a more cohesive "habits & routines" section and reduces visual clutter in the task column.

## What Changes

- Remove `DailyWorkflow` from the center tasks column in `TodayView.jsx`
- Render `DailyWorkflow` inside `PlannerHabitsPanel.jsx`, below the habits list (or as a collapsible section underneath)
- The workflow section remains collapsible and functionally unchanged

## Capabilities

### New Capabilities
- `workflow-under-habits`: DailyWorkflow rendered inside the habits panel in the Today tab's left column, below the habits list

### Modified Capabilities
- None

## Impact

- `src/components/TodayView.jsx` — remove `DailyWorkflow` import and usage from center column
- `src/components/PlannerHabitsPanel.jsx` — import and render `DailyWorkflow` at the bottom of the panel
