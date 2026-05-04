## MODIFIED Requirements

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
