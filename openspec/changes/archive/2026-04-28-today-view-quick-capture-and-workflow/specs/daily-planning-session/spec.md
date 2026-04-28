## MODIFIED Requirements

### Requirement: Daily planning session is accessible from the Today view
The "Plan My Day" button SHALL be visible in the app header or Today view header at all times. The Today view SHALL additionally display the quick-capture bar and the Daily Workflow section as persistent sections within the view.

#### Scenario: Button is visible in Today view
- **WHEN** the user is on any view
- **THEN** the "Plan My Day" button SHALL be visible in the main navigation header

#### Scenario: Today view shows quick-capture and workflow sections
- **WHEN** the user navigates to the Today view
- **THEN** the quick-capture input SHALL be visible at the top of the task list AND the Daily Workflow section SHALL be visible below it
