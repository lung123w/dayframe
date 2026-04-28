## ADDED Requirements

### Requirement: User can define an ordered list of daily workflow steps
The Today view SHALL include a "Daily Workflow" section where the user can add, reorder, and delete plain-text workflow steps. Steps SHALL be persisted across sessions and appear every day.

#### Scenario: User adds a workflow step
- **WHEN** the user types a step name in the workflow input and presses Enter
- **THEN** the step SHALL be appended to the workflow list and persisted to the database

#### Scenario: User deletes a workflow step
- **WHEN** the user activates the delete action on a workflow step
- **THEN** the step SHALL be removed from the list and deleted from the database

#### Scenario: Steps persist across sessions
- **WHEN** the user closes and reopens the app
- **THEN** all previously defined workflow steps SHALL still appear in the Daily Workflow section

### Requirement: User can check off workflow steps each day
Each workflow step SHALL have a checkbox. Checking a step SHALL record a completion for today's date. The completion state SHALL reset automatically at the start of each new day.

#### Scenario: User checks a step
- **WHEN** the user checks a workflow step checkbox
- **THEN** the step SHALL appear visually completed (e.g. strikethrough) and the completion SHALL be saved with today's date

#### Scenario: User unchecks a step
- **WHEN** the user unchecks a completed workflow step
- **THEN** the completion record for today SHALL be removed and the step SHALL appear uncompleted

#### Scenario: Steps reset on a new day
- **WHEN** the user opens the app on a different calendar day than when steps were last checked
- **THEN** all workflow step checkboxes SHALL appear unchecked (previous day completions are not shown)

#### Scenario: Prior day completions are not deleted
- **WHEN** a new day begins and steps visually reset
- **THEN** completion records from previous days SHALL remain in the database (not deleted)

### Requirement: Daily Workflow section is collapsible
The Daily Workflow section in the Today view SHALL be collapsible so the user can hide it when not needed.

#### Scenario: User collapses the workflow section
- **WHEN** the user clicks the collapse toggle on the Daily Workflow section header
- **THEN** the workflow step list SHALL be hidden and only the section header SHALL remain visible

#### Scenario: User expands the workflow section
- **WHEN** the user clicks the expand toggle on a collapsed Daily Workflow section
- **THEN** the workflow step list SHALL become visible again
