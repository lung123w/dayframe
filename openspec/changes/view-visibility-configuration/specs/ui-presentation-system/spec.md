# ui-presentation-system Specification (Delta)

## MODIFIED Requirements

### Requirement: One shared shell carries navigation on every view
DayFrame SHALL render every view inside one shared shell: a single ~52px top strip carrying the app name, the current date as the page title, the main destinations (Today, Week, Habits, Review) that the view-visibility preference keeps visible, and a "More" overflow holding the visible overflow destinations (Finance, Projects) plus Settings, Backup and Notifications.

#### Scenario: Every visible view is reachable at any width
- **WHEN** the viewport is 768px wide or narrower
- **THEN** the shell SHALL still expose navigation to every view the visibility preference keeps visible, without a dead end

#### Scenario: The active destination is visible
- **WHEN** a view is active
- **THEN** its destination SHALL be marked active using the reserved accent, and the page title SHALL name the period that view shows

#### Scenario: The shell sets only documented view values
- **WHEN** navigation is used
- **THEN** it SHALL set `activeView` to one of the six destination ids or to the `settings` shell value, and no router and no new app-level view state SHALL be introduced

#### Scenario: The Settings entry cannot be hidden
- **WHEN** any visibility preference is in effect
- **THEN** the More overflow SHALL still render the Settings entry, Backup and Notifications, and the Settings page SHALL be reachable

#### Scenario: The strip names the Settings page and marks no view
- **WHEN** the `settings` shell value is active
- **THEN** the strip's page title SHALL read `Settings · ` followed by the same long date the strip renders on every other view, and none of the six view destinations SHALL be marked active (Settings is a shell value, not a seventh destination)

### Requirement: Today is the cold open
DayFrame SHALL open on the `today` view while it is visible, and on the first visible view in the canonical order otherwise, and the day's tasks SHALL be captured, completed and ordered on that surface.

#### Scenario: A fresh load opens Today
- **WHEN** the app loads and `today` is in the visible set
- **THEN** the `today` view SHALL render and the Today destination SHALL be marked active

#### Scenario: A fresh load with Today hidden opens the first visible view
- **WHEN** the app loads and `today` is not in the visible set
- **THEN** the first visible view in the canonical order `[today, planner, habits, review, finance, projects]` SHALL render and be marked active

#### Scenario: The week view reads the day
- **WHEN** the user opens the Week (`planner`) view
- **THEN** it SHALL present the same tasks as a reference surface for the week and SHALL NOT require a second, competing ordering
