# monthly-financial-review Specification (Delta)

## ADDED Requirements

### Requirement: The Finance review provides a final statement-filing step
The Finance view SHALL render a statement-filing step as the review's last actionable section, on the current month only, offering a preview of what the filing job would do and a run-now action, and showing the result of the run. Past months SHALL NOT render the step.

#### Scenario: The step renders on the current month
- **WHEN** the user opens the Finance view on the current month
- **THEN** a `File statements` section SHALL be rendered after the Photos section and before the Reference section, with a preview action and a run-now action

#### Scenario: The step is absent on a past month
- **WHEN** the user selects a month earlier than the current month
- **THEN** the statement-filing section SHALL NOT be rendered

#### Scenario: Running requires a preview first
- **WHEN** the section has just loaded and no preview has been taken
- **THEN** the run-now action SHALL be unavailable until a preview has been produced

#### Scenario: The preview shows what will move
- **WHEN** the user takes a preview
- **THEN** the section SHALL list the files that will be filed with their target names and destination folders, the files that will be left in the box with a plain-language reason, and the reported misfiles, name variants and unknown names

#### Scenario: The step shows which months are missing
- **WHEN** a preview has been taken
- **THEN** the section SHALL show, per series, the months present and missing in the current year

#### Scenario: The result summary distinguishes filed from locked
- **WHEN** a run completes with some files filed and others still held in the box by a OneDrive lock
- **THEN** the summary SHALL report the filed and cleaned counts, and SHALL describe each locked file as filed with its box copy still pending removal by the scheduled cleaner, never as a failure

#### Scenario: The last run is visible after a reload
- **WHEN** the user reloads the Finance view after a run
- **THEN** the section SHALL show the last run's time and counts

#### Scenario: The two destination folders are stated
- **WHEN** the section renders
- **THEN** it SHALL name the two destination roots it files into, so the user can see where the documents go without running anything
