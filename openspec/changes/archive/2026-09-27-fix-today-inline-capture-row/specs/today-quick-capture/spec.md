## MODIFIED Requirements

### Requirement: User can capture a task by typing a title and pressing Enter
The capture line SHALL be always visible on every view; on the Today view it SHALL render as the first row inside the Today task list, above the `OVERDUE` section header, collapsed to a quiet single line styled like the task rows around it until focus enters it. When the user types a title and presses Enter, the system SHALL immediately create a new task with that title, today's date as the due date, status `pending`, and no other fields populated.

#### Scenario: The capture row is the first row of the Today list
- **WHEN** the Today view renders
- **THEN** the capture row SHALL be the first element inside the Today task list container, and it SHALL precede the `OVERDUE` section header in document order

#### Scenario: Exactly one capture affordance on Today
- **WHEN** the Today view renders
- **THEN** exactly one quick-capture input SHALL exist in the document, and no capture line SHALL render in the shell chrome above the Today panel

#### Scenario: The capture row reveals its controls on focus
- **WHEN** focus enters the Today capture row
- **THEN** the project and priority controls SHALL be present, and when focus leaves the row for a target outside it they SHALL be hidden again

#### Scenario: The capture row does not shift the list
- **WHEN** the Today capture row is focused at a viewport 768px wide or wider
- **THEN** the task rows below it SHALL NOT move

#### Scenario: The other five views keep the shell capture line
- **WHEN** the user is on any view other than Today
- **THEN** the capture line SHALL render in the shell chrome and its project and priority controls SHALL be visible without focus

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
- **THEN** the capture line SHALL be available and SHALL create the task with the same defaults, wherever it is mounted

#### Scenario: The capture key focuses the line
- **WHEN** the user presses `/` while no text field has focus
- **THEN** the capture line SHALL take focus, and the key SHALL NOT be typed into the field

#### Scenario: Capture inherits the last used project and priority
- **WHEN** a task is captured after a previous capture or edit chose a project or a priority
- **THEN** the new task SHALL inherit those last-used values, and with no stored preference SHALL be created with the documented defaults
