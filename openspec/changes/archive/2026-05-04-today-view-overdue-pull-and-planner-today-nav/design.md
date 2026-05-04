## Context

Two independent UX friction points in the daily workflow:

1. **Today view overdue pull**: The Today view (`TodayView.jsx`) shows an Overdue section listing tasks whose due date is before today. Currently there is no bulk action — users must open each overdue task individually and reschedule it. The overdue section header just shows the count.

2. **Planner orange circle nav**: In the Planner view, `MiniWeekBar.jsx` renders each day as a button; today's day-number is styled with an orange circle (`.mini-week-day--today`). When the user navigates to a different week (prev/next), today's orange circle is no longer visible — there is no persistent "jump to today" affordance. The orange circle itself should act as a clickable anchor that always jumps the week view back to the current week.

## Goals / Non-Goals

**Goals:**
- Add a "Pull all to today" button in the Overdue section header of TodayView that bulk-reschedules all overdue tasks to today's date via `taskService.update()`
- Make the today orange circle in MiniWeekBar always navigable: add a dedicated "Today" button (or re-purpose the week label area) that calls back to reset the week to the current week, ensuring today is always reachable in one click

**Non-Goals:**
- Pulling individual overdue tasks (one-by-one) — that's already possible via task edit
- Adding a floating "back to today" widget outside the MiniWeekBar
- Changing how overdue tasks are displayed or sorted

## Decisions

### 1. Overdue Pull-to-Today: Button placement
Place a small "Pull to today" button inside the existing `tv-section-header--overdue` div, alongside the count label. This is the most discoverable location and avoids adding a new UI region.

**Alternative considered**: A separate button below the section header — rejected, clutters the list.

### 2. Overdue Pull-to-Today: Implementation
Iterate over all `overdueTasks` and call `taskService.update(id, { dueDate: today })` for each. Call `onDataChange()` once after all updates resolve (via `Promise.all`). TodayView receives `onDataChange` (or `onAssignDate`) as a prop from App.jsx — use whichever is already wired.

### 3. Planner Today Nav: "Today" button in MiniWeekBar
Add a "Today" button (text or small dot) to the `mini-week-nav` row, between the prev/next arrows. Clicking it calls a new `onGoToToday` prop that `DailyPlanner` implements by resetting `weekStartDate` to `startOfWeek(new Date(), { weekStartsOn: 1 })`.

**Alternative considered**: Make the orange circle itself a link — rejected, the circle is only visible when today is already in the current week view, so it doesn't solve the cross-week navigation problem.

## Risks / Trade-offs

- [Bulk reschedule] Destructive if accidentally triggered → Mitigation: button label "Pull all to today" is explicit; no confirmation dialog needed given single-user context and easy task edit to undo
- [MiniWeekBar prop threading] Requires a new `onGoToToday` prop passed from DailyPlanner → MiniWeekBar, but both files are small and the change is localized
