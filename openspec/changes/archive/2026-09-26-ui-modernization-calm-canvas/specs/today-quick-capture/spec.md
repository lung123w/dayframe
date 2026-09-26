# today-quick-capture Specification (Delta)

## MODIFIED Requirements

### Requirement: User can capture a task by typing a title and pressing Enter
The shared shell SHALL provide an always-visible inline capture line that is present on every view; on the Today view it SHALL sit at the top of the task list. When the user types a title and presses Enter, the system SHALL immediately create a new task with that title, today's date as the due date, status `pending`, and no other fields populated.

#### Scenario: Task created on Enter key
- **WHEN** the user types text into the quick-capture input and presses Enter
- **THEN** a new task SHALL be created with the typed title and today's date, and the input SHALL clear ready for the next capture

#### Scenario: Input cleared on Escape
- **WHEN** the user presses Escape while the quick-capture input is focused
- **THEN** the input text SHALL be cleared and focus SHALL remain on the input

#### Scenario: Empty input is ignored
- **WHEN** the user presses Enter with an empty quick-capture input
- **THEN** no task SHALL be created and the input SHALL remain empty

#### Scenario: Newly captured task appears in Today view immediately
- **WHEN** a task is created via quick capture
- **THEN** it SHALL appear in the Today task list without a page reload

#### Scenario: The capture line is present on every view
- **WHEN** the user is on any of the six views
- **THEN** the capture line SHALL be available and SHALL create the task with the same defaults

#### Scenario: The capture key focuses the line
- **WHEN** the user presses `/` while no text field has focus
- **THEN** the capture line SHALL take focus, and the key SHALL NOT be typed into the field

#### Scenario: Capture inherits the last used project and priority
- **WHEN** a task is captured after a previous capture or edit chose a project or a priority
- **THEN** the new task SHALL inherit those last-used values, and with no stored preference SHALL be created with the documented defaults
