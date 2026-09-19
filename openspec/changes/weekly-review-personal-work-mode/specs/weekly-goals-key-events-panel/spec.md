# weekly-goals-key-events-panel Specification (Delta)

## MODIFIED Requirements

### Requirement: Weekly Goals sub-section preserves existing behaviour

The "Weekly Goals" sub-section SHALL retain goal checkbox functionality
(add, complete/uncomplete, remove). Each week SHALL store goals under a
specific `mode` (`'personal'` or `'work'`); only the row matching the
panel's active mode SHALL be rendered.

#### Scenario: Add a goal in the active mode

- **WHEN** user types a goal and presses Enter or clicks the add button
  while the active mode is `'personal'`
- **THEN** the goal is appended to the personal row for the current
  week; the work row (if any) is untouched

#### Scenario: Complete a goal

- **WHEN** user checks a goal's checkbox
- **THEN** the goal is marked completed with visual strikethrough
  styling; persisted under the active mode's row

#### Scenario: Switching the active mode swaps the visible goal list

- **WHEN** the panel's active mode changes (e.g. via
  `localStorage['wr.mode']`) and the panel reloads
- **THEN** the goals rendered come from the row matching the new mode;
  the previous mode's goals remain in storage

## ADDED Requirements

### Requirement: Panel reads mode from shared localStorage key

The Weekly Goals & Key Events panel SHALL read its active mode from
`localStorage['wr.mode']` (default `'personal'`) and SHALL request
the matching `weekly_objectives` row. This key is the same one the
Review tab writes, so the two views stay in sync without extra
plumbing.

#### Scenario: First open defaults to personal mode

- **WHEN** the DailyPlanner mounts and no `wr.mode` key exists
- **THEN** the panel calls
  `weeklyObjectiveService.getByWeek(weekStart)` (no mode param) and
  the server defaults to `'personal'`

#### Scenario: Review tab's mode change reflects in the panel

- **WHEN** the user changes `wr.mode` in the Review tab and returns
  to the DailyPlanner for the same week
- **THEN** the panel calls
  `weeklyObjectiveService.getByWeek(weekStart, mode)` with the new
  mode and renders that row

### Requirement: Sync goals bridging action writes to the active mode

The bridging action on the Review tab SHALL write weekly goals into
the row matching the active mode of `weekly_objectives`, not always
the personal row. The existing confirm dialog SHALL include the
active mode in its copy.

#### Scenario: Sync in Personal mode writes the personal row

- **WHEN** the user clicks "Write weekly goals to DayFrame" while the
  Review tab is in Personal mode
- **THEN** the PUT goes to
  `/api/weekly-objectives` with `mode:'personal'`; the work row for
  the same week is untouched

#### Scenario: Sync in Work mode writes the work row

- **WHEN** the user clicks "Write weekly goals to DayFrame" while the
  Review tab is in Work mode
- **THEN** the PUT goes to
  `/api/weekly-objectives` with `mode:'work'`; the personal row for
  the same week is untouched

#### Scenario: Confirm dialog reflects the active mode

- **WHEN** existing objectives exist for the active mode and the user
  clicks "Write weekly goals to DayFrame"
- **THEN** the confirm copy mentions the active mode (e.g.
  "This will replace 3 existing weekly objective(s) for this week
  in your **Work** review with your 3 review goal(s). Continue?")