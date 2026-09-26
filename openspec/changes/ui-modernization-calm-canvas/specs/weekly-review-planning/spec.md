# weekly-review-planning Specification (Delta)

## MODIFIED Requirements

### Requirement: Review tab entry in sidebar
The shared shell SHALL expose a "Review" destination alongside Today, Week and Habits (with Finance and Projects in the shell's "More" overflow) that switches the app to the `review` view, distinct from Today, Week, Habits, Finance and Projects.

#### Scenario: The shell shows the Review destination
- **WHEN** the app renders the shell
- **THEN** a "Review" destination appears as a text destination in the shell and is clickable

#### Scenario: Navigate to Review tab
- **WHEN** the user activates the "Review" destination
- **THEN** the main area renders the WeeklyReview component and Review is marked active in the shell

### Requirement: Week selection for review
The WeeklyReview view SHALL let the user select which week to review, defaulting to the current week (Monday–Sunday, week starts on Monday), with Previous, Next, and "This Week" controls and a visible label of the selected week's date range. The view SHALL also name the second week it displays: the selected week is the planning week and `weekStart − 1` is the reviewed week, each with its own explicit label, so neither window is identifiable only by a parenthetical annotation.

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

#### Scenario: Both weeks are named without ambiguity
- **WHEN** the review view renders for a selected week
- **THEN** the planning week (document, goals, key events) and the reviewed week (habit summary) SHALL each carry an explicit visible label naming their dates, and SHALL NOT be distinguishable only by a parenthetical

#### Scenario: The reviewed week keeps its window
- **WHEN** the user changes the selected week
- **THEN** the habit summary SHALL still read `weekStart − 1` (Monday–Sunday of that prior week) and the document, goals and key-events grid SHALL still read the selected week
