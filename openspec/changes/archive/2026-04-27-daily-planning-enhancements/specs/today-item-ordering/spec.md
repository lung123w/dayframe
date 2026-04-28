## ADDED Requirements

### Requirement: Today tasks can be manually reordered
The system SHALL allow users to reorder tasks displayed in the Today view via drag-and-drop. The order SHALL be persisted in IndexedDB and restored on next load.

#### Scenario: User drags a task to a new position
- **WHEN** the user drags a task card in the Today view and drops it above or below another task
- **THEN** the task list SHALL reorder immediately to reflect the new position

#### Scenario: Order persists across page reloads
- **WHEN** the user reloads the page after reordering tasks in Today
- **THEN** the Today view SHALL display tasks in the previously saved order

#### Scenario: New tasks added to Today appear at the bottom
- **WHEN** a task is scheduled for today but has no saved position in the stored order
- **THEN** the task SHALL appear at the bottom of the Today list

#### Scenario: Deleted task IDs are silently removed from order
- **WHEN** a task referenced in the stored order no longer exists
- **THEN** the Today view SHALL render without that task and without errors

### Requirement: Touch users can reorder via arrow controls
The system SHALL provide up/down arrow buttons on each Today task card as a fallback reorder mechanism for touch devices.

#### Scenario: User taps up arrow on a task
- **WHEN** the user taps the up arrow button on a task that is not already first
- **THEN** the task SHALL move one position up in the Today list and the new order SHALL be persisted

#### Scenario: Up arrow disabled on first item
- **WHEN** a task is at the top of the Today list
- **THEN** the up arrow button SHALL be visually disabled and non-interactive
