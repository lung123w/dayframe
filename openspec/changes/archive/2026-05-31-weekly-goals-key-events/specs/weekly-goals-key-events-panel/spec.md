## ADDED Requirements

### Requirement: Unified weekly panel header
The `WeeklyObjectives` panel header SHALL be renamed to "Weekly Goals & Key Events" to reflect that it now contains both sub-sections.

#### Scenario: Panel displays correct title
- **WHEN** user views the DailyPlanner with the weekly panel expanded
- **THEN** the panel header reads "Weekly Goals & Key Events"

### Requirement: Two visible sub-sections when panel is expanded
The panel SHALL display two clearly labelled sub-sections when expanded: "Weekly Goals" and "Key Events This Week".

#### Scenario: Both sub-sections visible on expand
- **WHEN** the user expands the "Weekly Goals & Key Events" panel
- **THEN** both a "Weekly Goals" sub-section and a "Key Events This Week" sub-section are visible

#### Scenario: Both sub-sections hidden on collapse
- **WHEN** the user collapses the panel
- **THEN** both sub-sections are hidden

### Requirement: Weekly Goals sub-section preserves existing behaviour
The "Weekly Goals" sub-section SHALL retain all existing goal checkbox functionality: add, complete/uncomplete, and remove goals for the current week.

#### Scenario: Add a goal
- **WHEN** user types a goal and presses Enter or clicks the add button
- **THEN** the goal appears in the Weekly Goals list with an unchecked checkbox

#### Scenario: Complete a goal
- **WHEN** user checks a goal's checkbox
- **THEN** the goal is marked completed with visual strikethrough styling

### Requirement: Key Events This Week sub-section
The "Key Events This Week" sub-section SHALL display all key events whose date falls within the current week (Monday through Sunday of the selected week), grouped by day.

#### Scenario: Events shown for correct week
- **WHEN** the planner is set to a given week
- **THEN** only key events with dates Monday–Sunday of that week are shown in the sub-section

#### Scenario: Days with no events show empty affordance
- **WHEN** a day in the current week has no key events
- **THEN** that day still appears with a prompt to add an event

### Requirement: Key event CRUD within the panel
Users SHALL be able to add, edit, and delete key events directly within the "Key Events This Week" sub-section, with the same validation rules as before (title required).

#### Scenario: Add a key event
- **WHEN** user fills in a title and submits the add form for a day
- **THEN** the key event is saved and appears under that day

#### Scenario: Reject empty title
- **WHEN** user submits the add form without a title
- **THEN** the system SHALL NOT save the event and SHALL display an inline validation error

#### Scenario: Edit a key event
- **WHEN** user activates edit mode and saves changes
- **THEN** the updated event is persisted and reflected immediately

#### Scenario: Delete a key event with confirm
- **WHEN** user clicks delete and confirms
- **THEN** the event is removed from the list and deleted from the backend
