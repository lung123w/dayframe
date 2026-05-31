## Context

The app currently has Tasks, Projects, Team, and Goals views. Users need a focused weekly planning session to highlight key events — important milestones, deadlines, or notable occasions for the coming 7 days. These are distinct from actionable tasks; they are reference-level entries to keep the week's context in mind.

The app uses Dexie (IndexedDB) for all persistence, React 19 with hooks for state, and a vertical `Sidebar.jsx` for navigation between views.

## Goals / Non-Goals

**Goals:**
- Add a new `KeyEvents` view accessible from the sidebar
- Store key events in IndexedDB with a new `keyEvents` Dexie table
- Display events grouped by day for the next 7 days (today through today+6)
- Allow CRUD (add, edit, delete) for key events inline in the panel
- Each event has: title (required), date (required), optional description, optional category

**Non-Goals:**
- Integrating key events into the FullCalendar component
- Recurring key events
- Notifications or reminders for key events
- Sharing key events with team members

## Decisions

### 1. Separate table vs. reusing `tasks`
**Decision**: New `keyEvents` table in Dexie.

**Rationale**: Key events are semantically different from tasks — no status, no priority, no recurrence. Mixing them into `tasks` would add null fields and complicate existing task queries. A clean separate table keeps the model simple.

### 2. 7-day window (today + 6 days)
**Decision**: Show today through today+6 (7 days total).

**Rationale**: "Coming week" naturally means the next 7 days. Using a rolling window (not Mon–Sun) ensures relevance regardless of day of week.

### 3. View navigation via existing Sidebar
**Decision**: Add a new icon entry to `Sidebar.jsx` for the Key Events view.

**Rationale**: Consistent with how other views (Projects, Calendar, Team, Goals) are navigated. No new navigation pattern needed.

### 4. Inline add/edit vs. modal
**Decision**: Use a lightweight inline form (no modal) for adding/editing events.

**Rationale**: Key events are simple (title + date + optional fields). A modal adds unnecessary friction. The `YearlyGoals.jsx` inline editing pattern is a good precedent in this codebase.

## Risks / Trade-offs

- **[Risk] IndexedDB schema version bump** → Must increment Dexie version and define migration. Existing data unaffected since it's a new table addition only.
- **[Trade-off] No calendar integration** → Key events won't appear in the FullCalendar view, keeping scope tight but potentially confusing users who expect them there. Can be addressed in a follow-up change.
- **[Risk] Date boundary bugs** → Rolling 7-day window depends on local date. Use `date-fns` `startOfDay` and `addDays` to avoid timezone edge cases.
