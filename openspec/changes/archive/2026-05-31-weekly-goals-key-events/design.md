## Context

The app has two recent but disconnected weekly-planning features:
1. `WeeklyObjectives` — a collapsible panel in `DailyPlanner` showing weekly goals as a checkbox list, scoped to the current week's Monday. Data stored in `weekly_objectives` table.
2. `WeeklyKeyEvents` — a standalone full-page view added in the `weekly-key-events` change, accessible from the sidebar. Data stored in `key_events` table.

The standalone key events view creates fragmentation: a user must navigate away from the planner to capture key events, breaking the planning flow. The fix is to merge key events into the existing `WeeklyObjectives` panel as a second sub-section, then remove the standalone page.

## Goals / Non-Goals

**Goals:**
- Merge key events display into `WeeklyObjectives` as a second collapsible/visible sub-section
- Rename the panel header to "Weekly Goals & Key Events"
- Keep the two sub-sections visually distinct: "Weekly Goals" (checkbox list) and "Key Events This Week" (day-grouped event cards)
- Remove the standalone `WeeklyKeyEvents` component, its CSS, the sidebar nav entry, and the `keyEvents` view route
- Pass key event data + handlers through `DailyPlanner` → `WeeklyObjectives` as props

**Non-Goals:**
- Changing the `key_events` backend API or database schema
- Adding recurring key events
- Calendar integration for key events

## Decisions

### 1. Absorb key events into `WeeklyObjectives` rather than creating a new combined component
**Decision**: Extend `WeeklyObjectives.jsx` directly.

**Rationale**: `WeeklyObjectives` is already placed correctly in `DailyPlanner`, already has the collapsible wrapper, and already handles week-scoped data. Adding key events as a second section inside it avoids adding a new component slot in `DailyPlanner` or restructuring the layout.

### 2. Scope key events to the current week (Mon–Sun of the selected week) not a rolling 7-day window
**Decision**: Use Monday of the selected week through Sunday (7 days) — consistent with how `WeeklyObjectives` already derives `weekStart` from `selectedDate`.

**Rationale**: The weekly goals panel is already week-scoped (Mon–Sun). Using the same window makes the two sections coherent — they represent the same week. A rolling "today+6" window would show different days depending on when you look, which is inconsistent with goals that are tied to a calendar week.

### 3. Key events sub-section always visible (not separately collapsible)
**Decision**: Both sub-sections are visible whenever the outer panel is expanded. No independent collapse toggle for each sub-section.

**Rationale**: Keeps the UI simple. The outer toggle already handles show/hide for the whole panel.

### 4. Prop-drilling through DailyPlanner
**Decision**: Pass `keyEvents`, `onAddKeyEvent`, `onUpdateKeyEvent`, `onDeleteKeyEvent` from `App` → `DailyPlanner` → `WeeklyObjectives`.

**Rationale**: The app uses prop-drilling throughout (no context/store). This is consistent with the existing pattern.

## Risks / Trade-offs

- **[Risk] DailyPlanner prop surface grows** → Mitigated by grouping the four new props together; they are clearly named and scoped.
- **[Trade-off] Key events scoped to Mon–Sun instead of rolling window** → Events added for days outside the current Mon–Sun window won't show in this panel. This is acceptable — the planner is week-oriented, not day-rolling.
- **[Risk] Deleting WeeklyKeyEvents.test.jsx loses test coverage** → Mitigated by rewriting equivalent tests for the merged component under `WeeklyObjectives.test.jsx`.
