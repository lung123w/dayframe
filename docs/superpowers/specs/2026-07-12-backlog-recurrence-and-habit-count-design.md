# Design: Backlog Recurrence Filtering + Habit Count Tracking

## Scope

Two independent changes in one OpenSpec change (lowest common denominator for `opsx-apply`):

1. **Backlog filter for recurring tasks** — recurring source tasks disappear from backlog until the next instance is overdue.
2. **Habit count tracking** — habits can be tracked by repetitions (reps) instead of time, with a per-habit choice.

---

## Change 1: Backlog Recurrence Filtering

### Problem
A recurring source task has a `dueDate` (its first instance). The backlog filter `t.status === 'pending' && (!t.dueDate || isOverduePending(t))` in `BacklogSidebar.jsx:24` shows the source whenever it has any due date. So a daily recurring task is always visible in the "Unscheduled" backlog view, and a weekly task sits in backlog between instances.

### Goal
Hide the recurring source from backlog when its **next instance** is today or in the future. Show it only when the next instance is overdue (i.e., missed).

### Approaches Considered

| Option | Pros | Cons |
|---|---|---|
| A. Compute next instance at filter time in `BacklogSidebar` | Pure presentational change, no DB migration, always reflects current date | Recomputes on every render (cheap — pattern math is O(steps)) |
| B. Add `hiddenFromBacklog` flag on task | Server can persist the decision | Stale when app opens days later; needs refresh on app boot |
| C. Add a memoized `nextInstanceDate` field to the task | Fastest reads | Adds a derived field that can drift; needs invalidation logic |

**Chosen: A** — pure function, no schema change, always correct. The existing `getNextOccurrence` helper in `recurrence.js:95` already gives us the math; we just need to find the first occurrence `>= today`.

### Design (Change 1)

1. **New helper** in `src/utils/recurrence.js`:
   ```js
   getNextOccurrenceFrom(task, fromDate) → Date | null
   ```
   Walks the recurrence pattern starting from `task.dueDate` until it finds a date `>= fromDate`. Returns `null` if the pattern has an end date that has already passed.

2. **Filter logic** in `BacklogSidebar.jsx:displayTasks` useMemo:
   - For a non-recurring task: keep existing behavior (`!dueDate || isOverduePending`).
   - For a recurring task: compute `nextInstance = getNextOccurrenceFrom(task, today)`. If `nextInstance` is `null` (recurrence ended) or `nextInstance <= today`, include in "Unscheduled" backlog. Otherwise exclude.
   - "All Pending" view: unchanged (user explicitly asked for everything there).

3. **Tests** in `src/__tests__/BacklogSidebar.test.jsx` (new):
   - Daily recurring with future next instance → not in unscheduled backlog.
   - Daily recurring with overdue next instance → in backlog with overdue badge.
   - Recurring with end date in past → not in backlog.
   - Non-recurring task with future due date → not in unscheduled backlog (existing behavior).

### Files touched
- `src/utils/recurrence.js` — add `getNextOccurrenceFrom`
- `src/components/BacklogSidebar.jsx` — update filter
- `src/__tests__/recurrence.test.js` — add tests for new helper
- `src/__tests__/BacklogSidebar.test.jsx` — new test file

---

## Change 2: Habit Count Tracking

### Problem
Every habit currently tracks `timeSpentSeconds` only. For push-ups, pull-ups, or squats, the user wants to log **reps** (count of repetitions) instead of duration. There is also a hidden assumption: `timeSpentSeconds === 0` means "done" with no time logged, which is a usable truthy signal for "complete" but doesn't carry reps.

### Goal
Let a habit be created/edited as either:
- **Duration** (current behavior — `timeSpentSeconds`)
- **Count** (new — `count: integer`)

The "Mark Done" UI swaps between a time popover and a reps stepper. Heatmap tooltips and totals adapt.

### Data Model

Add to habit:
```ts
{
  ...existing fields,
  trackType: 'duration' | 'count'   // default 'duration' for backward compat
}
```

Add to habit entry:
```ts
{
  ...existing fields,
  count: number | null               // populated when habit.trackType === 'count'
}
```

We **keep** `timeSpentSeconds` as the default for legacy entries and for duration habits — no migration needed for existing data.

### Approaches Considered

| Option | Pros | Cons |
|---|---|---|
| A. New `trackType` on habit, new `count` on entry | Clean type per habit, clear schema | One more field |
| B. Reuse `timeSpentSeconds` as a generic `value` | No schema growth | Loses semantic clarity; "900" is 15 min or 900 reps? |
| C. Two entry tables (`habit_entries_time`, `habit_entries_count`) | Strong typing | Big migration, query joins, two heatmaps |

**Chosen: A** — minimal change, fully backward compatible, semantically clear.

### Design (Change 2)

1. **Habit modal** (`HabitModal.jsx`):
   - New "Track by" radio group under Frequency: `Duration` / `Repetitions`. Defaults to `duration` when editing existing habits.
   - Save: pass `trackType` along with the existing fields.

2. **New `RepsPopover` component** (`src/components/RepsPopover.jsx`):
   - Mirror of `TimePopover` layout. Shows a stepper `[-  N  +]` with min 0, manual number input, and a "Save" button. Clamps negative values.
   - Reuses the same absolute positioning pattern.

3. **HabitTracker.jsx** & **PlannerHabitsPanel.jsx**:
   - When `habit.trackType === 'count'`, render `RepsPopover` instead of `TimePopover` on the "Mark Done" button.
   - `handleToggleToday(habitId, value)` writes to `count` for count habits, `timeSpentSeconds` for duration habits.
   - Manual-time log button on `HabitTracker.jsx` swaps to "Add Reps" with the same stepper pattern when `trackType === 'count'`.

4. **Heatmap** (`HabitHeatmap.jsx`):
   - When showing the tooltip, branch on `habit.trackType`. For count, show `N reps`; for duration, keep `formatTimeSpent(timeSpentSeconds)`. Cell intensity scales off the right value.

5. **Summary line** on each habit (`HabitTracker.jsx:267`):
   - "X min total" for duration, "Y reps total" for count.

6. **Tests**:
   - `HabitModal.test.jsx` (extend) — selecting "Repetitions" persists `trackType: 'count'`.
   - `HabitTracker.test.jsx` (extend) — count habits call `habitEntryService.create` with `count`, not `timeSpentSeconds`.
   - `habits.test.js` (extend) — `formatCount` utility, plus a `getTotalForHabit` helper that picks the right field.

### New utilities (`src/utils/habits.js`)
- `formatCount(n)` — returns `"{n} reps"` (or "{n} rep" when n===1)
- `getEntryValue(entry, habit)` — returns `entry.count` for count habits, `entry.timeSpentSeconds` for duration habits
- `getEntryUnit(habit)` — returns `'reps' | 'minutes'`

### Files touched
- `src/api.js` — none (services already pass through arbitrary fields)
- `src/components/HabitModal.jsx` + `.css` — add "Track by" radio
- `src/components/RepsPopover.jsx` + `.css` — new
- `src/components/HabitTracker.jsx` — branch on trackType for log button + popover
- `src/components/PlannerHabitsPanel.jsx` — branch on trackType for popover
- `src/components/HabitHeatmap.jsx` — branch on trackType for tooltip + intensity
- `src/utils/habits.js` — add `formatCount`, `getEntryValue`, `getEntryUnit`
- `src/__tests__/*` — extend existing tests + add RepsPopover tests

---

## Out of Scope
- Editing a habit's `trackType` while it has entries (warn-only, not blocked)
- Per-day reps targets (e.g., "do 20 today")
- Aggregating count habits in `PlannerHabitsPanel` (it stays duration-friendly)
- Storing reps in the same field as time

## Open Questions
None — all clarified.
