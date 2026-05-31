## Why

The standalone Weekly Key Events view (added recently) is disconnected from the existing Weekly Goals panel, forcing users to navigate between two separate places to plan their week. Consolidating both into a single unified "Weekly Goals & Key Events" section gives a complete weekly context in one place and removes the now-redundant sidebar entry.

## What Changes

- **Remove** the standalone "Key Events" sidebar entry and its dedicated full-page view
- **Rename** the existing `WeeklyObjectives` component header from "Weekly Goals" to "Weekly Goals & Key Events"
- **Split** the component body into two clearly labelled sub-sections:
  1. **Weekly Goals** — existing checkbox goal list (unchanged behaviour)
  2. **Key Events This Week** — inline 7-day key event list showing events from the `key_events` table, with add/edit/delete support per day
- The `WeeklyKeyEvents` standalone component and its CSS are **removed** (functionality absorbed into `WeeklyObjectives`)
- The "Key Events" nav item is **removed** from `Sidebar.jsx`
- The `keyEvents` view case and related state/handlers in `App.jsx` are **removed** (key events data still loaded and passed to `WeeklyObjectives`)

## Capabilities

### New Capabilities
- `weekly-goals-key-events-panel`: A unified panel combining Weekly Goals and Key Events for the current week, shown as two sub-sections inside the existing collapsible weekly panel

### Modified Capabilities
- `weekly-key-events`: Requirements change — key events are no longer a standalone view; they are embedded inside the weekly goals panel scoped to the current week (today → today+6)

## Impact

- `src/components/WeeklyObjectives.jsx` — major update to host both sub-sections
- `src/components/WeeklyObjectives.css` — updated styles for two-section layout
- `src/components/WeeklyKeyEvents.jsx` — **deleted** (functionality merged into WeeklyObjectives)
- `src/components/WeeklyKeyEvents.css` — **deleted**
- `src/components/Sidebar.jsx` — remove "Key Events" nav item
- `src/App.jsx` — remove `keyEvents` view routing; keep `keyEvents` state + handlers, pass to `WeeklyObjectives` via `DailyPlanner`
- `src/components/DailyPlanner.jsx` — pass `keyEvents`, `onAddKeyEvent`, `onUpdateKeyEvent`, `onDeleteKeyEvent` props down to `WeeklyObjectives`
- `src/__tests__/WeeklyKeyEvents.test.jsx` — **deleted** (tests migrated to `WeeklyObjectives` test)
- Backend `key_events` table and API unchanged
