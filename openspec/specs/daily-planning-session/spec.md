## ADDED Requirements

### Requirement: User can open a daily planning session
The system SHALL provide a "Plan My Day" button that opens a planning modal where the user can review and select tasks to focus on for the current day.

#### Scenario: User opens the planning modal
- **WHEN** the user clicks the "Plan My Day" button
- **THEN** a modal SHALL open showing tasks that are overdue, due today, or unscheduled (up to the next 7 days)

#### Scenario: Planning modal groups tasks by urgency
- **WHEN** the planning modal is open
- **THEN** tasks SHALL be grouped into sections: "Overdue", "Due Today", and "Upcoming (next 7 days)"

### Requirement: User selects tasks to include in Today
The system SHALL allow the user to check/uncheck tasks in the planning modal to indicate which tasks they plan to work on today.

#### Scenario: User checks a task in the planning modal
- **WHEN** the user checks a task in the planning modal and confirms
- **THEN** that task SHALL appear in the Today view and be included in the persisted today order

#### Scenario: User confirms the planning session
- **WHEN** the user clicks "Start Day" or equivalent confirm button in the modal
- **THEN** the modal SHALL close, the Today view SHALL update to reflect selected tasks, and the selection SHALL be saved

#### Scenario: User cancels the planning session
- **WHEN** the user clicks "Cancel" or closes the modal without confirming
- **THEN** no changes SHALL be made to the Today view or stored order

### Requirement: Daily planning session is accessible from the Today view
The "Plan My Day" button SHALL be visible in the app header or Today view header at all times.

#### Scenario: Button is visible in Today view
- **WHEN** the user is on any view
- **THEN** the "Plan My Day" button SHALL be visible in the main navigation header
