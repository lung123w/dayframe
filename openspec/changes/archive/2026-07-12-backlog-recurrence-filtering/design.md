## Context

`BacklogSidebar.jsx` (lines 22–41) builds its visible task list with two filters, one per view mode. The "Unscheduled" mode currently shows any pending task that has no `dueDate` or is overdue (`isOverduePending`). The "All Pending" mode shows every pending task. Recurring source tasks always have a `dueDate` (their first instance), so they appear in the "Unscheduled" backlog whenever the next instance is in the future — cluttering the view with items that are already on the calendar.

The recurrence pattern math is already centralized in `src/utils/recurrence.js` (`generateRecurringTasks` and `getNextOccurrence`). The fix is a small, pure-function addition and a one-line filter change.

## Goals / Non-Goals

**Goals:**
- Recurring source tasks are hidden from "Unscheduled" backlog when their next instance is today or later.
- A recurring source whose next instance is strictly before today still appears (with the existing overdue badge).
- A recurring source whose `endDate` has passed no longer appears.
- The "All Pending" view is unchanged.
- Non-recurring task filtering is unchanged.

**Non-Goals:**
- Touching calendar/day-column/daily-planning views.
- Generating per-instance backlog rows.
- Adding any persistence, schema, or API changes.

## Decisions

**D1. Compute next instance at filter time, not at write time.**
- The backlog filter is computed on every render in a `useMemo`. The pattern walk is a single step (the second occurrence), so it is trivially cheap.
- Storing a `nextInstanceDate` field would require invalidation on app boot, on edits, and when the device clock changes. Pure derivation avoids all of that.

**D2. Return the second occurrence (one step after `dueDate`), not the first occurrence on or after `fromDate`.**
- Spec semantics: "next instance is today" for a daily source whose first instance was yesterday means the second occurrence is today. "Next instance (yesterday)" for a daily source whose first instance was two days ago means the second occurrence is yesterday.
- This is the simplest formulation that matches all spec scenarios: the second occurrence is strictly before `fromDate` exactly when the user is behind by at least one cycle.
- Reuses the existing `getNextOccurrence` helper to take one step from `dueDate`.

**D3. New function returns `null` when the pattern has ended by `fromDate` or has fewer than two occurrences.**
- Uses `fromDate` to detect an ended pattern: if `pattern.endDate` is strictly before `fromDate`, return `null`.
- Also returns `null` when `endAfterOccurrences` is `0` or `1` (no second occurrence possible), or when the second occurrence would be past `endDate`.
- `BacklogSidebar` treats `null` as "no upcoming instance → hide".

**D4. Apply the new rule only inside the "Unscheduled" view branch.**
- The user explicitly wanted the "All Pending" view to keep showing everything. Mirroring that intent keeps the change tight.

## Risks / Trade-offs

- [Clock drift] → Recomputed every render, so always reflects current date without invalidation logic.
- [End date with `endAfterOccurrences`] → Both are handled by simple field checks; no iteration is needed. The function terminates in O(1).
- [Performance] → O(1) per recurring task per render (one date-fns `addDays`/`addWeeks`/`addMonths`/`addYears` call). Acceptable.
- [Backwards compatibility] → Existing tests for `recurrence.js` keep passing; only additive. Backlog tests are new.

## Migration Plan

- Pure code change, no data migration.
- Rollback: revert the single `BacklogSidebar.jsx` filter and the new helper.

## Open Questions

None.
