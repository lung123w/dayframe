## ADDED Requirements

### Requirement: Review tab entry in sidebar
The sidebar SHALL include a "Review" navigation item in the VIEWS section that switches the app to the `review` view, distinct from Today, Planner, Habits, and Projects.

#### Scenario: Sidebar shows Review entry
- **WHEN** the app renders the sidebar
- **THEN** a "Review" item appears in the VIEWS section with its own icon and is clickable

#### Scenario: Navigate to Review tab
- **WHEN** the user clicks the "Review" sidebar item
- **THEN** the main area renders the WeeklyReview component and the Review item is highlighted as active

### Requirement: Week selection for review
The WeeklyReview view SHALL let the user select which week to review, defaulting to the current week (Monday–Sunday, week starts on Monday), with Previous, Next, and "This Week" controls and a visible label of the selected week's date range.

#### Scenario: Defaults to current week on first open
- **WHEN** the user opens the Review tab for the first time in a session
- **THEN** the selected week is the current Monday–Sunday and the week range label reflects it

#### Scenario: Navigate to previous week
- **WHEN** the user clicks Previous
- **THEN** the selected week moves back by 7 days and all review sections reload for that week

#### Scenario: Navigate to next week
- **WHEN** the user clicks Next
- **THEN** the selected week moves forward by 7 days and all review sections reload for that week

#### Scenario: Jump back to current week
- **WHEN** the user clicks "This Week"
- **THEN** the selected week resets to the current Monday–Sunday

### Requirement: Weekly miscellaneous cleanup checklist
The cleanup section SHALL render a per-week checklist that is pre-populated from a default template on first access of a new week. Each item SHALL be checkable, editable, addable, and removable, and the full checklist state SHALL persist per week.

#### Scenario: New week seeded from default template
- **WHEN** the user opens a week that has no stored cleanup tasks
- **THEN** the checklist is pre-populated with the default cleanup template items (inbox, desktop box, physical box, outbox, device wipe, Kindle Economist download with link, weekly blueprint)

#### Scenario: Check a cleanup item
- **WHEN** the user toggles a cleanup item's checkbox
- **THEN** the item's completed state updates immediately and is persisted for that week

#### Scenario: Edit a cleanup item's text
- **WHEN** the user edits an item's text and saves
- **THEN** the updated text is shown and persisted for that week

#### Scenario: Add a cleanup item
- **WHEN** the user adds a new cleanup item
- **THEN** it appears as an unchecked item in the list and is persisted for that week

#### Scenario: Remove a cleanup item
- **WHEN** the user removes a cleanup item
- **THEN** it is removed from the list and the removal is persisted for that week

#### Scenario: Cleanup item with a link renders as a link
- **WHEN** a cleanup item has an associated URL (e.g. the Economist Kindle download)
- **THEN** the item renders an actionable link to that URL

### Requirement: Weekly gratitude list
The gratitude section SHALL let the user write down things they are grateful for as free-text entries, with a prompt targeting 5 entries. Entries SHALL be addable, editable, and removable, and SHALL persist per week.

#### Scenario: Add a gratitude entry
- **WHEN** the user types a gratitude entry and submits it
- **THEN** the entry appears in the gratitude list and is persisted for that week

#### Scenario: Gratitude prompt is shown
- **WHEN** the gratitude section renders
- **THEN** the user sees a prompt encouraging them to write down 5 things they are grateful about

#### Scenario: Remove a gratitude entry
- **WHEN** the user removes a gratitude entry
- **THEN** it is removed from the list and the removal is persisted for that week

#### Scenario: Edit a gratitude entry
- **WHEN** the user edits an existing gratitude entry
- **THEN** the updated text is shown and persisted for that week

### Requirement: Weekly reflection prompts
The reflection section SHALL present four fixed reflection prompts about the past week as free-text answer fields, and the answers SHALL persist per week.

#### Scenario: Four reflection prompts are shown
- **WHEN** the reflection section renders
- **THEN** the user sees four prompts: completed goals / performance, unexpected obstacles, energy levels, and habit minimums

#### Scenario: Save a reflection answer
- **WHEN** the user types into a reflection answer field
- **THEN** the answer is persisted for that week and restored on reload

#### Scenario: Habit completion summary is surfaced for the habit prompt
- **WHEN** the habit-minimum reflection prompt renders
- **THEN** a read-only summary of the selected week's habit completion is shown alongside the answer field, loaded from the existing habit entries data

### Requirement: Weekly goals with minimum viable steps
The goal setup section SHALL let the user define weekly goals, each with a text and a minimum viable next step, with a prompt targeting 3 goals. Goals SHALL be addable, editable, removable, and checkable, and SHALL persist per week.

#### Scenario: Add a weekly goal with a minimum step
- **WHEN** the user adds a goal with text and a minimum viable step
- **THEN** the goal appears in the list with its minimum step and is persisted for that week

#### Scenario: Goal prompt is shown
- **WHEN** the goal setup section renders
- **THEN** the user sees a prompt encouraging them to set 3 main goals, each with a minimum startup step

#### Scenario: Edit a goal or minimum step
- **WHEN** the user edits a goal's text or minimum step
- **THEN** the change is shown and persisted for that week

#### Scenario: Remove a weekly goal
- **WHEN** the user removes a weekly goal
- **THEN** it is removed from the list and the removal is persisted for that week

### Requirement: Sync weekly goals to DayFrame
The goal setup section SHALL provide a "Write weekly goals to DayFrame" bridging action that copies the text of the review's weekly goals into the existing weekly objectives for the selected week. The action SHALL confirm before replacing existing objectives, and SHALL record a per-week sync flag indicating goals were synced.

#### Scenario: Sync goals when no existing objectives
- **WHEN** the user clicks "Write weekly goals to DayFrame" and the week has no existing weekly objectives
- **THEN** the review goals' texts are written as new weekly objectives for that week (each unchecked) and the sync flag is set

#### Scenario: Confirm before replacing existing objectives
- **WHEN** the user clicks the sync action and the week already has weekly objectives
- **THEN** the system shows a confirmation indicating existing objectives will be replaced, and only proceeds on confirm

#### Scenario: Sync flag reflected as a checked checkbox
- **WHEN** goals have been synced for the selected week
- **THEN** the "Write weekly goals to DayFrame" checkbox appears checked and remains so on reload of that week

### Requirement: Key events for the week in review
The goal setup section SHALL list the selected week's key events (Monday–Sunday) using the existing key events data, and SHALL allow adding a key event for a day in that week via the existing key events API.

#### Scenario: List key events for the selected week
- **WHEN** the review view loads for a selected week
- **THEN** key events whose date falls within Monday–Sunday of that week are displayed grouped by day

#### Scenario: Add a key event from the review tab
- **WHEN** the user adds a key event for a day in the selected week
- **THEN** the event is created via the existing key events service and appears in the review's key events list

#### Scenario: Key events checkbox reflects completion
- **WHEN** the user has listed/added key events for the week
- **THEN** the "List this week's key events" checkbox can be marked complete and the state is persisted for that week

### Requirement: Per-week review persistence
The full review document (cleanup tasks, gratitude entries, reflection answers, weekly goals, sync flags) SHALL be persisted in the backend keyed by week start date, accessible via `/api/weekly-reviews`, and SHALL survive page reloads and browser restarts.

#### Scenario: Reload page with an in-progress review
- **WHEN** the user reloads the app after partially completing a week's review
- **THEN** all previously saved review state for that week is restored

#### Scenario: Get review for a week with no saved data
- **WHEN** the system requests a week that has no saved review
- **THEN** the API returns a document with empty defaults (empty arrays/objects) so the UI can seed from templates

#### Scenario: Upsert review on edit
- **WHEN** any review field is mutated
- **THEN** the full document is upserted to the backend by week start and the updated state is reflected on next load
