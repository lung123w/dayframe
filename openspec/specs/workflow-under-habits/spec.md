## Requirements

### Requirement: DailyWorkflow rendered inside habits panel
The system SHALL render the `DailyWorkflow` component at the bottom of `PlannerHabitsPanel`, below the habits list, in the Today tab's left column.

#### Scenario: Workflow visible in habits panel
- **WHEN** the user opens the Today tab
- **THEN** the DailyWorkflow section appears at the bottom of the left column habits panel

#### Scenario: Workflow removed from center column
- **WHEN** the user views the Today tab center column
- **THEN** DailyWorkflow is no longer rendered there

#### Scenario: Workflow remains collapsible
- **WHEN** the user clicks the DailyWorkflow header
- **THEN** the workflow step list toggles expanded/collapsed as before
