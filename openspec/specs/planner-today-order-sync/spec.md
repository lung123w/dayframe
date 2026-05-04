## ADDED Requirements

### Requirement: Reordering in the planner today column syncs to Today view order
When the user reorders tasks within today's column in the Daily Planner, the `todayOrder` settings SHALL be updated to reflect the new order, so the Today view displays tasks in the same sequence.

#### Scenario: Planner reorder on today updates todayOrder
- **WHEN** the user drags and drops a task within today's day column in the Daily Planner
- **THEN** the `todayOrder` settings value SHALL be updated to reflect the new order of tasks for today

#### Scenario: Planner reorder on a non-today column does not affect todayOrder
- **WHEN** the user reorders tasks within a day column that is not today
- **THEN** the `todayOrder` settings value SHALL remain unchanged

### Requirement: Reordering in the Today view syncs task sortOrder
When the user reorders tasks in the Today view, the `sortOrder` field on each real (non-recurring) task SHALL be updated to reflect the new position, so the Daily Planner's today column shows tasks in the same order.

#### Scenario: Today view reorder updates task sortOrder
- **WHEN** the user reorders tasks in the Today view
- **THEN** each non-recurring task's `sortOrder` field SHALL be updated to its new position index

#### Scenario: Recurring instances do not receive sortOrder updates
- **WHEN** the user reorders tasks in the Today view and the list includes recurring task instances
- **THEN** only non-recurring (real) tasks SHALL have their `sortOrder` updated; recurring instances SHALL be skipped silently

### Requirement: Planner week navigation always provides access to the current week
The Planner view's MiniWeekBar SHALL include a persistent "Today" button that, when clicked, resets the displayed week to the week containing the current date, regardless of which week the user has navigated to.

#### Scenario: Today button resets week to current week
- **WHEN** the user has navigated to a different week (past or future) in the Planner
- **THEN** clicking the "Today" button SHALL reset `weekStartDate` to `startOfWeek(new Date(), { weekStartsOn: 1 })`
- **THEN** the current day SHALL be visible in the week columns with its orange circle indicator

#### Scenario: Today button is always visible in MiniWeekBar
- **WHEN** the Planner view is displayed
- **THEN** the "Today" button SHALL be visible in the MiniWeekBar navigation row at all times, not just when today is in the current week

#### Scenario: Today button when already on current week
- **WHEN** the user is already viewing the week containing today
- **THEN** clicking "Today" SHALL have no visible effect (week does not change)
