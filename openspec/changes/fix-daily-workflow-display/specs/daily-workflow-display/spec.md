## MODIFIED Requirements

### Requirement: Header shows visible separator when expanded
The Daily Workflow header SHALL display a visible bottom border (`1px solid var(--border, #E2E8F0)`) when the section is expanded (not collapsed).

#### Scenario: Expanded state shows border
- **WHEN** the Daily Workflow section is expanded (collapsed = false)
- **THEN** the header element SHALL have the `dw-header--expanded` CSS class applied
- **THEN** a visible bottom border separates the header from the task body

#### Scenario: Collapsed state hides border
- **WHEN** the Daily Workflow section is collapsed (collapsed = true)
- **THEN** the header element SHALL NOT have the `dw-header--expanded` class
- **THEN** no bottom border is shown on the header
