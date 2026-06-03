## ADDED Requirements

### Requirement: Per-instance field overrides stored on base task
The system SHALL store per-instance field overrides (title, description, priority, project, scheduledTime) in an `instanceOverrides` map on the base task record, keyed by instance date ISO string, without modifying any other instance.

#### Scenario: Saving an instance edit stores only the override
- **WHEN** a user edits a recurring instance with scope "this instance" and changes the title
- **THEN** the base task's `instanceOverrides[instanceDate].title` is updated to the new value
- **THEN** the base task's own `title` field is unchanged
- **THEN** all other instances retain the original title

#### Scenario: Saving "all instances" updates the base task
- **WHEN** a user edits a recurring instance with scope "all instances"
- **THEN** the base task record is updated with the new field values
- **THEN** all instances reflect the change

### Requirement: Instance overrides applied during recurrence expansion
The system SHALL merge `instanceOverrides[instanceDate]` onto each virtual instance when expanding recurring tasks, so overridden fields are reflected in the rendered task.

#### Scenario: Overridden title shown on instance
- **WHEN** a recurring task has `instanceOverrides["2026-06-01T..."].title = "Custom title"`
- **THEN** the instance rendered on 2026-06-01 displays "Custom title"
- **THEN** instances on other dates display the base task title

#### Scenario: No override returns base value
- **WHEN** a recurring task has no entry in `instanceOverrides` for a given instance date
- **THEN** the instance is rendered with the base task's field values

### Requirement: Scope selector shown when editing a recurring instance
The system SHALL display a scope selector in the TaskModal when the task being edited is a recurring instance, offering "This instance" (default) and "All instances" choices.

#### Scenario: Scope selector visible for recurring instance
- **WHEN** a user opens a recurring instance in the TaskModal
- **THEN** a scope selector is displayed with options "This instance" and "All instances"
- **THEN** "This instance" is selected by default

#### Scenario: No scope selector for non-recurring tasks
- **WHEN** a user opens a non-recurring task in the TaskModal
- **THEN** no scope selector is displayed

### Requirement: Modal pre-populates with instance-specific values
The system SHALL pre-populate the TaskModal form with any existing per-instance field overrides when editing a recurring instance, so the user sees the instance's current effective values.

#### Scenario: Modal shows overridden title
- **WHEN** a recurring instance has an overridden title in `instanceOverrides`
- **THEN** the TaskModal title field shows the overridden title, not the base task title
