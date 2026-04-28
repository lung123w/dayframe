### Requirement: User can capture a task by typing a title and pressing Enter
The Today view SHALL provide an always-visible inline text input at the top of the task list. When the user types a title and presses Enter, the system SHALL immediately create a new task with that title, today's date as the due date, status `pending`, and no other fields populated.

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

### Requirement: User can edit a quick-captured task's details
Each task in the Today view SHALL show an edit affordance. When activated, the system SHALL open the TaskModal pre-populated with the task's current data so the user can add project, priority, due time, or description.

#### Scenario: Edit icon opens TaskModal
- **WHEN** the user clicks the edit icon on a Today task row
- **THEN** the TaskModal SHALL open with that task's fields pre-filled

#### Scenario: Saved changes reflected in Today view
- **WHEN** the user saves changes in the TaskModal
- **THEN** the updated task SHALL be reflected in the Today view immediately
