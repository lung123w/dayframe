# Spec: Weekly Key Events

## MODIFIED Requirements

### Requirement: Key event CRUD within the panel
Users SHALL be able to add, edit, and delete key events directly within the "Key Events This Week" sub-section of the "Weekly Goals & Key Events" panel (not in a standalone page). The date range for displayed events is Monday–Sunday of the currently selected week (not a rolling 7-day window from today). All other validation rules are unchanged (title required).

#### Scenario: Add a key event
- **WHEN** user fills in a title and submits the add form for a day within the current week panel
- **THEN** the key event is saved and appears under that day in the panel

#### Scenario: Reject empty title
- **WHEN** user submits the add form without a title
- **THEN** the system SHALL NOT save the event and SHALL display an inline validation error

#### Scenario: Edit a key event
- **WHEN** user activates edit mode and saves changes within the panel
- **THEN** the updated event is persisted and reflected immediately in the panel

#### Scenario: Delete a key event with confirm
- **WHEN** user clicks delete and confirms within the panel
- **THEN** the event is removed and deleted from the backend

### Requirement: Persist key events across sessions
The system SHALL persist all key events in the backend database so they survive page reloads and browser restarts, accessible via `/api/key-events`.

#### Scenario: Reload page with existing key events
- **WHEN** user reloads the app after creating key events
- **THEN** all previously saved key events are loaded and displayed correctly in the "Key Events This Week" sub-section of the weekly panel

## REMOVED Requirements

### Requirement: View weekly key events panel (standalone)
**Reason**: The standalone full-page key events view has been replaced by the embedded "Key Events This Week" sub-section inside the "Weekly Goals & Key Events" panel in DailyPlanner. There is no longer a dedicated sidebar entry or full-page view for key events.
**Migration**: Key events are still stored in the `key_events` table and accessible via `/api/key-events`. Users access them through the "Weekly Goals & Key Events" collapsible panel in the Planner view.
