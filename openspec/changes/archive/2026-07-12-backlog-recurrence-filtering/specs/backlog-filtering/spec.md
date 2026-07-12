## ADDED Requirements

### Requirement: Backlog "Unscheduled" view filters out future recurring sources

The BacklogSidebar "Unscheduled" view MUST exclude recurring source tasks whose next instance is today or in the future. The source MUST appear (with the existing overdue badge) when its next instance is strictly before today. The view MUST also exclude recurring sources whose recurrence pattern has ended (end date passed or occurrences exhausted). The "All Pending" view is not affected by this rule and continues to list every pending task.

#### Scenario: Daily recurring source with future next instance
- **WHEN** a recurring task with pattern `{type: 'daily', interval: 1}` and `dueDate` of yesterday is filtered by the "Unscheduled" view
- **THEN** the task does NOT appear in the backlog because its next instance is today (today is not strictly before today)

#### Scenario: Daily recurring source with overdue next instance
- **WHEN** a recurring task with pattern `{type: 'daily', interval: 1}` and `dueDate` of two days ago is filtered by the "Unscheduled" view
- **THEN** the task appears in the backlog with the overdue badge because its next instance (yesterday) is strictly before today

#### Scenario: Recurring source whose pattern has ended
- **WHEN** a recurring task has `recurrencePattern.endDate` strictly before today
- **THEN** the task does NOT appear in the "Unscheduled" backlog

#### Scenario: Weekly recurring source with future instance
- **WHEN** a recurring task with pattern `{type: 'weekly', interval: 1, daysOfWeek: [3]}` and `dueDate` of last Friday is filtered by the "Unscheduled" view on a Monday
- **THEN** the task does NOT appear in the backlog because its next instance (next Wednesday) is in the future

#### Scenario: "All Pending" view is unchanged
- **WHEN** the user selects the "All Pending" view
- **THEN** all pending tasks appear, including recurring sources with future next instances

### Requirement: Recurring tasks not required for the view do not appear in the search-filtered list

The BacklogSidebar search and project filter operate on the post-filter task list. If a recurring source is excluded by the "Unscheduled" view rule, it MUST also be excluded from the searched/filtered list of that view. Search across "All Pending" continues to include every pending task.

#### Scenario: Search within "Unscheduled" skips future recurring sources
- **WHEN** the user types a query that matches a recurring source with a future next instance while the "Unscheduled" view is active
- **THEN** the matching recurring source does not appear in the results

### Requirement: Non-recurring task filtering is unchanged

Tasks that are not recurring MUST continue to be filtered by the existing rules: in the "Unscheduled" view they appear only when they have no `dueDate` or when their `dueDate` is strictly before today.

#### Scenario: Non-recurring future task in "Unscheduled" view
- **WHEN** a non-recurring task has a `dueDate` in the future
- **THEN** it does not appear in the "Unscheduled" backlog

#### Scenario: Non-recurring overdue task in "Unscheduled" view
- **WHEN** a non-recurring task has a `dueDate` strictly before today
- **THEN** it appears in the "Unscheduled" backlog with the overdue badge

#### Scenario: Non-recurring task with no due date in "Unscheduled" view
- **WHEN** a non-recurring task has no `dueDate`
- **THEN** it appears in the "Unscheduled" backlog
