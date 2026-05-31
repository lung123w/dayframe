## Why

Users need a dedicated space to capture and review the most important events happening in the coming week — not just tasks, but meaningful milestones, deadlines, or occasions that shape the week's priorities. The existing calendar and task views don't provide a focused "weekly highlights" lens for planning ahead.

## What Changes

- Add a **Weekly Key Events** panel/section to the app
- Users can add, edit, and delete key events for the current and upcoming week
- Each key event has a title, date, optional description, and optional category/tag
- The panel shows events grouped by day for the next 7 days (starting from today)
- Key events are distinct from regular tasks — they are milestones or notable occurrences, not actionable to-dos
- Persisted in IndexedDB via a new `keyEvents` table

## Capabilities

### New Capabilities
- `weekly-key-events`: A session/panel that lets users capture, view, and manage key events for the coming week, displayed grouped by day with add/edit/delete support

### Modified Capabilities
<!-- None — this is a self-contained new capability with no changes to existing spec behavior -->

## Impact

- New `keyEvents` table in Dexie database (`db.js`)
- New `KeyEvent` model class and `keyEventService` in `db.js`
- New `WeeklyKeyEvents.jsx` component in `src/components/`
- New navigation entry in `Sidebar.jsx` to access the weekly key events view
- App state in `App.jsx` updated to load/manage key events
