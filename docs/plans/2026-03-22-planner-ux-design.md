# Planner UX + Habit Window Design

## Context

The planner currently has five user-visible issues:

1. Task descriptions saved in rich text are not shown in the primary planner day cards.
2. Daily habits are only reachable from the Habits tab, not from the planner entry point.
3. Progress updates should be directly editable in planner UI (task status and subtasks) without opening modals.
4. Weekly mini calendar behavior is inconsistent and can show unexpected next-week context.
5. Backlog should include pending items that were planned for today once they become overdue, without clearing due dates.

This design aligns to explicit user choices:

- Inline progress scope: task status + subtasks first.
- Overdue backlog behavior: show in backlog, keep due date unchanged.
- Habit window placement: left side near backlog.
- Week behavior: always anchor mini week to current week.

## Goals

- Make planner cards complete enough for quick daily execution (title + description + progress controls).
- Reduce context switching by exposing daily habit actions in planner.
- Make weekly context predictable (current week anchor).
- Ensure backlog captures missed pending work naturally after the due day passes.

## Non-Goals

- No redesign of full HabitTracker page.
- No task schema or API contract changes.
- No introduction of additional status states beyond existing `pending` and `completed` for planner flow.

## Approach Options

### Option A (Recommended): Targeted component updates

Directly update affected planner components (`DayColumn`, `BacklogSidebar`, `DailyPlanner`, `MiniWeekBar`) and add one lightweight planner-only habits panel.

Trade-offs:

- Pros: fastest delivery, smallest risk, minimal code churn.
- Cons: some planner logic remains distributed across components.

### Option B: Shared planner selectors/refactor first

Create shared selectors/hooks for week derivation, backlog candidate logic, and progress transitions, then refactor components to consume them.

Trade-offs:

- Pros: cleaner long-term architecture.
- Cons: larger scope and higher regression risk for current request.

### Option C: Introduce planner state container

Build a centralized planner context/store first, then implement all requested behavior changes through it.

Trade-offs:

- Pros: strong structural baseline for future complexity.
- Cons: overkill for current requirements and slower time-to-value.

## Chosen Design

Use Option A.

## Component and Data-Flow Design

### 1) Description rendering bug fix

- Update `src/components/DayColumn.jsx` expanded task card rendering to display `task.description` when present.
- Use the existing rich HTML display pattern used elsewhere (render as HTML content block).
- Keep mini cards compact; description shown only in expanded mode.

Data flow:

- `TaskModal` already saves rich HTML into `description`.
- `DailyPlanner` passes tasks into `DayColumn`.
- `DayColumn` renders description inline on expanded cards.

### 2) Daily habits window on planner page

- Add a compact planner-specific habits panel component near the backlog (left rail).
- This panel shows today-focused habit rows and direct mark-done / unmark actions.
- Keep it intentionally lightweight; do not embed full `HabitTracker` interaction model.

Data flow:

- New panel calls existing `habitService.getAll()` and `habitEntryService.getByHabit()`.
- Toggle actions call existing create/delete-by-date endpoints for today.
- Panel reloads local data after mutations.

### 3) Inline progress updates in planner UI

- Keep task status toggle directly on planner cards.
- Keep subtask checkboxes inline on expanded cards.
- Normalize planner status cycle to `pending <-> completed` to match stored model and backlog filters.
- Maintain compatibility handling for legacy values if present in old data.

Data flow:

- `DayColumn` invokes `onStatusUpdate` and `onSubtaskToggle` callbacks.
- `App.jsx` existing handlers persist updates and reload data.

### 4) Weekly mini calendar behavior

- Make mini week derive from current date week anchor (Mon-Sun containing today).
- Keep date selection functionality but ensure visible week remains current-week scoped.

Data flow:

- `DailyPlanner` controls selected date.
- `MiniWeekBar` computes visible days from current-week anchor.
- Week navigation controls should not drift into unrelated next-week context.

### 5) Backlog enhancement for overdue pending tasks

- Extend backlog candidate logic to include pending overdue tasks while keeping their dueDate unchanged.
- Overdue tasks are visible in backlog list and retain overdue indication.

Data flow:

- `BacklogSidebar` computes display set from `tasks`:
  - pending unscheduled tasks
  - pending overdue scheduled tasks
- Existing click/drag interactions remain unchanged.

## Error Handling

- Follow existing component-level error logging (`console.error`) for async failures.
- Avoid crashing render paths when description is empty or malformed.
- Use local-date comparisons for overdue logic to avoid timezone edge misclassification.

## Testing Strategy

- Update `DayColumn` tests for description visibility and status transition behavior.
- Update `BacklogSidebar` tests for overdue-in-backlog behavior.
- Update `MiniWeekBar` tests for current-week anchoring behavior.
- Add focused tests for new planner habits panel today toggle behavior.
- Run targeted tests, then full test suite and lint.

## Risks and Mitigations

- Risk: status mismatch across legacy and current values.
  - Mitigation: explicit mapping/compatibility for legacy statuses during render/toggle.
- Risk: timezone boundary bugs in overdue detection.
  - Mitigation: normalize to local `YYYY-MM-DD` comparisons.
- Risk: planner left rail crowding.
  - Mitigation: keep habits panel compact and scannable.

## Rollout Notes

- Pure frontend behavior changes using existing API surfaces; no migrations expected.
- If any legacy test assumptions conflict with normalized status behavior, update tests to align with `pending/completed` model.
