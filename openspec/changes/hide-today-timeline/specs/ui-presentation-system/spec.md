## ADDED Requirements

### Requirement: The Today view is the habit rail plus one full-width task list
The `today` view SHALL present the day as the habit rail beside a single task list that takes all the width the view has left, and SHALL NOT reserve a column for a read-only time panel.

#### Scenario: The task list takes the whole width the view has left
- **WHEN** the Today view renders at 1440px
- **THEN** the task list SHALL occupy the space beside the habit rail with no empty column, dead gutter or phantom gap left by a removed panel, and the panel SHALL NOT scroll horizontally

#### Scenario: A row's text keeps a readable measure
- **WHEN** a task row renders at 1440px
- **THEN** its text column SHALL have gained width against the pre-change layout and SHALL NOT exceed 720px, and the row's metadata and actions SHALL stay flush to the panel's right edge

#### Scenario: No timeline panel is rendered
- **WHEN** the Today view renders, with or without tasks that carry a `startTime`
- **THEN** it SHALL render none of the Timeline panel's own markup — no hourly grid, no "Timeline" heading, no "No time set" list — and a task's `startTime` SHALL still be shown in its own row and stay editable

#### Scenario: Narrow widths still collapse to one column
- **WHEN** the viewport is 768px wide or narrower
- **THEN** the day's habit rail and its task list SHALL stack in one column as they do today, and no task row SHALL overflow or clip

### Requirement: A hidden presentation component is retained with its re-entry recorded
A presentation panel that is deliberately un-mounted SHALL keep its component and stylesheet in the repository, and its source SHALL record that it is intentionally not rendered and how to render it again.

#### Scenario: The component survives a dead-code sweep
- **WHEN** the Today view's Timeline panel is hidden
- **THEN** `DailyTimeline.jsx` and `DailyTimeline.css` SHALL remain in `src/components/`, and a test SHALL assert their presence and that the Today view no longer imports them

#### Scenario: The way back is written down
- **WHEN** a reader opens the un-mounted component
- **THEN** its header SHALL name the request and the decision (ADR-017) and SHALL state that re-rendering it from the Today view is the intended way back
