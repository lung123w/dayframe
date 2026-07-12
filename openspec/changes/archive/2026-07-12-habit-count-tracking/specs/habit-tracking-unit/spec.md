## ADDED Requirements

### Requirement: A habit declares its tracking unit

A habit MUST have a `trackType` of either `'duration'` or `'count'`. When a habit is created without an explicit `trackType`, it MUST default to `'duration'`. The HabitModal MUST present a "Track by" choice between "Duration" and "Repetitions" when creating or editing a habit.

#### Scenario: Creating a new duration habit
- **WHEN** the user creates a habit and chooses "Duration"
- **THEN** the saved habit has `trackType: 'duration'`

#### Scenario: Creating a new rep-count habit
- **WHEN** the user creates a habit and chooses "Repetitions"
- **THEN** the saved habit has `trackType: 'count'`

#### Scenario: Editing an existing habit preserves trackType by default
- **WHEN** the user opens the edit modal for an existing duration habit
- **THEN** the modal shows "Duration" selected by default and saves `trackType: 'duration'` on submit

#### Scenario: Changing trackType on an existing habit
- **WHEN** the user edits a duration habit and switches to "Repetitions"
- **THEN** the habit is saved with `trackType: 'count'`; the modal MUST display a notice that historical entries remain in their original unit

### Requirement: Count habits are logged with a rep value, not a duration

When a habit's `trackType` is `'count'`, completing it for a given day MUST open a reps input popover (with a stepper and manual number entry) instead of the time popover. The saved habit entry MUST record the rep count in a `count` field. The existing `timeSpentSeconds` field MUST remain `null` (or `0`) for that entry.

#### Scenario: Marking a count habit done
- **WHEN** the user clicks "Mark Done" on a count habit for today
- **THEN** the reps popover opens; on save, a habit entry is created with `habitId`, `date` = today, and `count` equal to the chosen value

#### Scenario: Toggling off today's count habit
- **WHEN** the user clicks "Done" on a count habit that is already marked for today
- **THEN** today's habit entry is removed (no new entry is created)

#### Scenario: Duration habits keep using the time popover
- **WHEN** the user clicks "Mark Done" on a duration habit
- **THEN** the time popover opens; on save, the entry is created with `timeSpentSeconds` equal to the chosen value and `count` is not set

### Requirement: Heatmap and totals reflect the habit's unit

For a count habit, the heatmap tooltip MUST display the rep count followed by "reps" (or "rep" when the count is 1), and the per-habit total MUST show "{N} reps". For a duration habit, the heatmap tooltip and total continue to use the existing `formatTimeSpent` behavior.

#### Scenario: Heatmap tooltip for a count habit entry
- **WHEN** the user hovers a heatmap cell for a day that has a count habit entry of 20
- **THEN** the tooltip shows "20 reps"

#### Scenario: Heatmap tooltip for a count habit entry of one
- **WHEN** the user hovers a heatmap cell for a day that has a count habit entry of 1
- **THEN** the tooltip shows "1 rep" (singular)

#### Scenario: Heatmap tooltip for a duration habit entry
- **WHEN** the user hovers a heatmap cell for a day that has a duration habit entry of 900 seconds
- **THEN** the tooltip shows "15m"

#### Scenario: Per-habit total for a count habit
- **WHEN** the user views a count habit whose entries total 130 reps
- **THEN** the habit row shows "130 reps"

#### Scenario: Per-habit total for a duration habit
- **WHEN** the user views a duration habit whose entries total 3,600 seconds
- **THEN** the habit row shows "1h 0m"

### Requirement: Backward compatibility for existing duration habits

Existing habits without an explicit `trackType` MUST behave as duration habits. Their existing entries MUST continue to display correctly in the heatmap and totals using the duration formatting utilities.

#### Scenario: Legacy habit with time entries
- **WHEN** a habit record has no `trackType` field and entries with `timeSpentSeconds`
- **THEN** it is treated as a duration habit; the modal opens with "Duration" preselected; heatmap tooltips and totals use the duration formatter
