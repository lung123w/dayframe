## ADDED Requirements

### Requirement: View weekly key events panel
The system SHALL provide a dedicated "Weekly Key Events" view accessible from the sidebar navigation, displaying all key events for the next 7 days (today through today+6) grouped by day.

#### Scenario: Navigate to weekly key events view
- **WHEN** user clicks the Weekly Key Events icon in the sidebar
- **THEN** the Weekly Key Events panel is displayed, showing 7 day columns from today through today+6

#### Scenario: Days with no events
- **WHEN** a day in the 7-day window has no key events
- **THEN** that day is still displayed with an empty state and an "Add event" affordance

### Requirement: Add a key event
The system SHALL allow users to add a new key event with a title (required), date (required), optional description, and optional category.

#### Scenario: Add event with title and date
- **WHEN** user fills in the title and date fields and submits the add-event form
- **THEN** the new key event is saved to IndexedDB and appears under the correct day in the panel

#### Scenario: Add event without title
- **WHEN** user submits the add-event form without a title
- **THEN** the system SHALL NOT save the event and SHALL display a validation error

#### Scenario: Add event with description and category
- **WHEN** user fills in optional description and category fields before submitting
- **THEN** the key event is saved with those fields and displayed accordingly in the panel

### Requirement: Edit a key event
The system SHALL allow users to edit the title, date, description, and category of any existing key event inline within the panel.

#### Scenario: Edit event title
- **WHEN** user activates edit mode for a key event and changes the title
- **THEN** the updated title is saved to IndexedDB and reflected in the panel immediately

#### Scenario: Edit event date to outside 7-day window
- **WHEN** user changes a key event's date to a day outside the current 7-day window
- **THEN** the event is saved with the new date and no longer appears in the current 7-day panel view

### Requirement: Delete a key event
The system SHALL allow users to delete any existing key event, removing it permanently from IndexedDB.

#### Scenario: Delete a key event
- **WHEN** user clicks the delete action on a key event and confirms
- **THEN** the event is removed from IndexedDB and disappears from the panel

### Requirement: Persist key events across sessions
The system SHALL persist all key events in IndexedDB so they survive page reloads and browser restarts.

#### Scenario: Reload page with existing key events
- **WHEN** user reloads the app after creating key events
- **THEN** all previously saved key events are loaded and displayed correctly in the panel
