## Context

The Today tab has a 3-column layout: left (habits), center (tasks + workflow), right (timeline). `DailyWorkflow` is currently rendered at the top of the center column inside `TodayView.jsx`. Since the workflow is a list of daily routine steps (conceptually the same category as habits), it belongs in the left column alongside `PlannerHabitsPanel`.

## Goals / Non-Goals

**Goals:**
- Move `DailyWorkflow` from the center column into the bottom of `PlannerHabitsPanel`
- Keep the workflow collapsible and fully functional

**Non-Goals:**
- Changing how `DailyWorkflow` works internally
- Redesigning the habits panel layout beyond accommodating the workflow section

## Decisions

**Render `DailyWorkflow` inside `PlannerHabitsPanel`**
- `PlannerHabitsPanel` already owns the left column; adding the workflow there keeps the left column self-contained
- Alternative: create a new wrapper component — rejected as unnecessary complexity for a simple relocation

## Risks / Trade-offs

- `PlannerHabitsPanel` will become slightly longer; no mitigation needed as the workflow is already collapsible
