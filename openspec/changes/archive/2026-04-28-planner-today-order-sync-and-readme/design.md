## Context

The app has two independent ordering systems for tasks:

1. **Today view** uses `todayOrder` — an array of task ID strings stored in the `settings` table via `settingsService`. It is loaded in `App.jsx` and passed down as a prop. Changes are handled by `handleTodayOrderChange` which only updates the settings key.

2. **Daily Planner** uses `sortOrder` — an integer column on each task row in the `tasks` table. The planner's `DailyPlanner.jsx` updates `sortOrder` directly via `taskService.update()` when reordering within a day.

When both views show today's tasks, they can display them in different orders because neither write-path informs the other. This change makes them bidirectionally consistent.

## Goals / Non-Goals

**Goals:**
- When `todayOrder` is saved (Today view reorder), also bulk-update each task's `sortOrder` to match the new position
- When the planner reorders tasks within today's column, also update `todayOrder` settings to match
- Update README to accurately reflect the current application state

**Non-Goals:**
- Syncing order for days other than today (planner reorder on non-today days only affects `sortOrder`, not `todayOrder`)
- Real-time sync between two simultaneously open tabs
- Changing how overdue tasks or recurring task instances are ordered

## Decisions

### Direction of truth: dual-write, no single source
**Decision**: Both ordering systems continue to exist; each write operation updates both.  
**Rationale**: Removing either system would be a larger refactor. `sortOrder` is used by the planner for all days, not just today — eliminating it would require rethinking the planner's entire sort logic. `todayOrder` supports recurring task instances (keyed as `taskId-instanceDate`) which can't be represented by a DB `sortOrder` field alone. Dual-write at the call site is the minimal, safe approach.  
**Alternative considered**: Make `sortOrder` the single source of truth and derive `todayOrder` from it on load — rejected because recurring instances can't have a stable `sortOrder` (they're virtual, not DB rows).

### Where to perform the dual-write
**Decision**: In `App.jsx`'s `handleTodayOrderChange`, add a loop to update `sortOrder` on each non-recurring task after saving `todayOrder`. In `DailyPlanner.jsx`'s same-day reorder, after writing `sortOrder`, call `onTodayOrderChange` if the day is today.  
**Rationale**: Keeps the sync logic co-located with existing order-write code. `App.jsx` already has access to all tasks and both services.

### Recurring instances
**Decision**: Only update `sortOrder` for tasks where `isRecurringInstance` is falsy (real task rows). Recurring instances have no DB row to update.  
**Rationale**: Recurring instances are virtual — they only exist in the expanded task list. Attempting to update them would silently fail or update the wrong row.

## Risks / Trade-offs

- **Risk**: N API calls on every Today reorder (one per task).  
  → Mitigation: Today's list is typically small (< 20 tasks); sequential updates are acceptable. A future batch endpoint could optimize this.

- **Risk**: Race condition if the user reorders very quickly.  
  → Mitigation: Updates are awaited sequentially; the UI is optimistic (order updates immediately) so visual jitter is minimal.

## Migration Plan

Additive-only change. No schema changes. Deploy as a normal release.
