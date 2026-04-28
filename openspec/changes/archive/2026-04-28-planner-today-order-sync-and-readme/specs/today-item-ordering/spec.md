## MODIFIED Requirements

### Requirement: Today tasks can be manually reordered
The system SHALL allow users to reorder tasks displayed in the Today view via drag-and-drop and arrow buttons. The order SHALL be persisted in both the `todayOrder` settings key and the `sortOrder` field on each task, keeping the Today view and Daily Planner today column in sync.

#### Scenario: User drags a task to a new position
- **WHEN** the user drags a task card in the Today view and drops it above or below another task
- **THEN** the task list SHALL reorder immediately to reflect the new position

#### Scenario: Order persists across page reloads
- **WHEN** the user reloads the page after reordering tasks in Today
- **THEN** the Today view SHALL display tasks in the previously saved order

#### Scenario: Reordering Today view updates task sortOrder
- **WHEN** the user reorders tasks in the Today view
- **THEN** each non-recurring task's `sortOrder` field SHALL be updated to match its new position

#### Scenario: New tasks added to Today appear at the bottom
- **WHEN** a task is scheduled for today but has no saved position in the stored order
- **THEN** the task SHALL appear at the bottom of the Today list

#### Scenario: Deleted task IDs are silently removed from order
- **WHEN** a task referenced in the stored order no longer exists
- **THEN** the Today view SHALL render without that task and without errors
