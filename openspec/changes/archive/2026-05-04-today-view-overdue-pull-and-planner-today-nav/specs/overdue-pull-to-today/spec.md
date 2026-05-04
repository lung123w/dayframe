## ADDED Requirements

### Requirement: Bulk pull overdue tasks to today
The Today view SHALL provide a "Pull to today" action in the Overdue section header that reschedules all overdue tasks to the current date in a single operation.

#### Scenario: Pull to today updates all overdue task due dates
- **WHEN** the user clicks the "Pull to today" button in the Overdue section header
- **THEN** every task in the overdue list SHALL have its `dueDate` updated to today's date via `taskService.update()`
- **THEN** the Today view SHALL refresh to show those tasks in the Today section instead of Overdue

#### Scenario: Pull to today button only visible when overdue tasks exist
- **WHEN** there are no overdue tasks
- **THEN** the Overdue section (including the "Pull to today" button) SHALL NOT be rendered

#### Scenario: Pull to today does not affect completed tasks
- **WHEN** the user clicks "Pull to today"
- **THEN** only pending overdue tasks SHALL be rescheduled; completed tasks SHALL remain unchanged
