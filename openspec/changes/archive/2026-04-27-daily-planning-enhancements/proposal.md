## Why

The app currently mixes user data (tasks, projects, team members) with source code in the same git repository, making it impossible to share or version the codebase without exposing personal data. Additionally, the Today view lacks flexibility — items cannot be reordered manually, and there is no structured daily planning session to set intentions at the start of the day.

## What Changes

- **Git-ignore user data**: Move or exclude IndexedDB-exported data files from git tracking so personal task/project data is never committed.
- **Today view item reordering**: Allow users to drag-and-drop or use up/down controls to reorder tasks displayed in the Today view, with order persisted locally.
- **Daily planning session**: Add a dedicated "Plan My Day" modal/panel that surfaces unscheduled or upcoming tasks and lets the user select and prioritize what to focus on today.

## Capabilities

### New Capabilities
- `today-item-ordering`: Persisted manual sort order for tasks in the Today view, with drag-and-drop reordering UI.
- `daily-planning-session`: A daily planning panel that presents upcoming/unscheduled tasks and guides the user to select and order today's focus items.
- `user-data-git-isolation`: Configuration and tooling to ensure user-generated data files are excluded from git tracking.

### Modified Capabilities
<!-- No existing spec-level requirements are changing -->

## Impact

- `src/db.js`: May need a new `todayOrder` field or a separate ordering table; no schema breaking changes expected.
- `src/components/`: New `DailyPlanningModal.jsx` component; `BacklogSidebar.jsx` and calendar/today views updated for reordering.
- `.gitignore`: Updated to exclude any exported or auto-saved data files.
- `src/App.jsx`: New handler and state for daily planning session and today item order.
