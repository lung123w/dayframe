# ui-presentation-system Specification (Delta)

## ADDED Requirements

### Requirement: A single token layer supplies every presentation value
DayFrame SHALL define its colour, type, space, radius and motion values once, as CSS custom properties in `src/styles/tokens.css`, and every stylesheet SHALL consume those properties instead of literal values.

#### Scenario: A value exists in exactly one place
- **WHEN** a stylesheet needs a palette colour, a page/surface shade, a hairline, the accent or a state colour
- **THEN** it SHALL reference a token from `src/styles/tokens.css`, and no component stylesheet SHALL introduce a new literal hex, a new font size or a new radius

#### Scenario: The type floor holds
- **WHEN** any text is styled
- **THEN** its size SHALL come from the type scale rows and SHALL NOT render below 11px, and only the caps-label role SHALL use 11px

#### Scenario: Both mode sets exist before dark mode ships
- **WHEN** `tokens.css` is read
- **THEN** it SHALL contain a complete light set and a complete dark set, so switching mode later is a token swap and not a component change

#### Scenario: The app has no network dependency for its typography
- **WHEN** the app loads with no network access
- **THEN** it SHALL render in the documented local/system font stack with no silent reflow, and `src/index.css` SHALL contain no `@import url(...)` pointing at a font host

#### Scenario: Text tokens clear the contrast floor
- **WHEN** a colour token is used as text on its ground
- **THEN** it SHALL clear 4.5:1 on that ground; a tone that does not clear it SHALL be used only for fills, dots and borders

#### Scenario: Motion respects the OS setting
- **WHEN** the operating system requests reduced motion
- **THEN** one global `prefers-reduced-motion` block SHALL reduce or remove transitions, and no state change SHALL exceed the documented duration scale

### Requirement: One shared shell carries navigation on every view
DayFrame SHALL render every view inside one shared shell: a single ~52px top strip carrying the app name, the current date as the page title, four text destinations (Today, Week, Habits, Review) and a "More" overflow holding Finance, Projects, Backup and Notifications.

#### Scenario: Every view is reachable at any width
- **WHEN** the viewport is 768px wide or narrower
- **THEN** the shell SHALL still expose navigation to all six views (`today`, `planner`, `habits`, `review`, `finance`, `projects`) without a dead end

#### Scenario: The active destination is visible
- **WHEN** a view is active
- **THEN** its destination SHALL be marked active using the reserved accent, and the page title SHALL name the period that view shows

#### Scenario: The shell changes no navigation contract
- **WHEN** navigation is used
- **THEN** it SHALL set the same six `activeView` values, and no router and no new app-level view state SHALL be introduced

### Requirement: Today is the cold open
DayFrame SHALL open on the `today` view, and the day's tasks SHALL be captured, completed and ordered on that surface.

#### Scenario: A fresh load opens Today
- **WHEN** the app loads
- **THEN** the `today` view SHALL render and the Today destination SHALL be marked active

#### Scenario: The week view reads the day
- **WHEN** the user opens the Week (`planner`) view
- **THEN** it SHALL present the same tasks as a reference surface for the week and SHALL NOT require a second, competing ordering

### Requirement: Rows replace cards and every row action is reachable without a pointer hover
List surfaces (Today, the Week day columns and the backlog) SHALL render their entries as hairline-separated rows rather than cards, and every action attached to an entry SHALL be reachable by keyboard focus and by touch, not only while a pointer hovers it.

#### Scenario: A keyboard user reaches the row actions
- **WHEN** a row receives focus by Tab or by list navigation
- **THEN** its actions SHALL be visible and the focus state SHALL be indicated by a visible focus indicator

#### Scenario: A touch user reaches the row actions
- **WHEN** the viewport has no hover capability
- **THEN** the same actions SHALL be operable, and no row action SHALL depend on `:hover` alone

#### Scenario: Row actions stay text-level
- **WHEN** a row's actions are shown
- **THEN** they SHALL read as text actions (move, defer) at label size, and rows SHALL NOT be separated by a card fill, a colour stripe or a shadow

### Requirement: Logging a habit is one action
A habit row SHALL record the day as done with a single activation, and an exact duration SHALL be an optional refinement of that same row.

#### Scenario: One activation logs the day
- **WHEN** the user activates a habit row's completion control on the Today habit rail or in the Habits view
- **THEN** the day's entry SHALL be written for that habit with zero minutes, without a further confirmation step

#### Scenario: Duration is an optional refinement
- **WHEN** the user sets a duration on a habit row for a date that already has an entry
- **THEN** the existing entry SHALL be replaced with the new value and the day SHALL NOT be written twice

#### Scenario: Habit values are not shared between rows
- **WHEN** the user types a value into one habit row's field
- **THEN** no other habit row's field SHALL change

### Requirement: Writes are debounced and their state is visible
Every surface that persists on edit SHALL debounce its writes and SHALL report the result in one visible status line.

#### Scenario: Typing does not write per keystroke
- **WHEN** the user types into a persisted field (review cleanup item, gratitude entry, reflection answer, goal, finance amount or note)
- **THEN** the write SHALL be debounced and SHALL NOT fire on every keystroke

#### Scenario: The save state is always visible
- **WHEN** a debounced write is pending, succeeds or fails
- **THEN** the same reserved status line SHALL show the pending, saved or not-saved state in place, and a failure SHALL be reported to the user rather than only to the console

### Requirement: Application dialogs replace native blocking dialogs
Every confirmation, alert and prompt SHALL be an in-app dialog with a focus trap, Escape dismissal and focus return.

#### Scenario: A destructive action asks in-app
- **WHEN** the user deletes a task, deletes a project, or replaces a week's objectives
- **THEN** the confirmation SHALL render as an in-app dialog that traps focus and returns focus to the invoking control when it closes

#### Scenario: No native blocking dialog remains
- **WHEN** the source is searched
- **THEN** `window.confirm`, `window.alert` and `window.prompt` SHALL have no call site under `src/`

#### Scenario: Escape closes the dialog, not the data
- **WHEN** the user presses Escape while a dialog is open
- **THEN** the dialog SHALL close and no write SHALL be issued

### Requirement: A documented keyboard layer, additive and droppable
DayFrame SHALL provide visible focus everywhere plus the documented shortcut set, with the command palette as the last, additive slice.

#### Scenario: Focus is always visible
- **WHEN** any interactive control receives keyboard focus
- **THEN** it SHALL show the visible focus indicator, and no rule SHALL remove the outline without supplying a replacement indicator

#### Scenario: List navigation and the capture key
- **WHEN** the user is on a list surface and presses the documented list keys
- **THEN** the focused row SHALL be navigated or acted on, and the capture key SHALL focus the capture line from any view

#### Scenario: The palette can be dropped
- **WHEN** the command-palette slice is removed
- **THEN** the rest of the presentation system SHALL still render and behave as specified, with no orphaned dependency

### Requirement: A presentation change preserves task, habit, period and image behaviour
A change that restyles a surface SHALL NOT alter task ordering, period windows, recurrence handling, image handling or stored data, and each of those behaviours SHALL be verified unchanged before the restyle is accepted.

#### Scenario: todayOrder and sortOrder stay in sync (ADR-006)
- **WHEN** a restyled Today or Week surface reorders a task
- **THEN** the `todayOrder` settings key and each task's `sortOrder` SHALL both still be updated, and both surfaces SHALL show the same order

#### Scenario: Weeks keep their Monday start and both review windows (ADR-004/ADR-005)
- **WHEN** a restyled week or review surface renders
- **THEN** the week SHALL still start on Monday in Hong Kong time, the habit summary SHALL still read the reviewed week (`weekStart − 1`), and the document, goals and key-events grid SHALL still read the selected plan week

#### Scenario: Recurrence survives the restyle (ADR-007)
- **WHEN** a recurring task is rendered, created or completed on a restyled surface
- **THEN** `recurrencePattern` SHALL still be persisted as a JSON object, the base date SHALL still fall on a day the pattern produces, and completing an instance SHALL still be written through the status override rather than the row's own status

#### Scenario: Images survive the restyle (ADR-003)
- **WHEN** a task-description image or a finance photo is pasted on a restyled surface
- **THEN** `descriptionImages` and the finance gallery SHALL still store base64 in the database, the paste path SHALL still reject a photo above 8 MB, and any month other than the current one SHALL still render read-only

#### Scenario: The WORK-toggle review area is not disturbed (ADR-009)
- **WHEN** the weekly review is restyled
- **THEN** the Personal/Work mode area SHALL keep its current behaviour on the branch where it exists, and the restyle SHALL NOT assume the `mode` column in code

#### Scenario: The live database is evidence, not a target (ADR-010)
- **WHEN** a verification reads data to prove a behaviour
- **THEN** it SHALL read the live `data/app.db` read-only and SHALL NOT rewrite, reseed or rebuild it

#### Scenario: No behaviour layer moves with the pixels
- **WHEN** a stage's diff is reviewed
- **THEN** it SHALL contain no change under `server/`, to the database, to `src/api.js` or to `src/utils/*`, and a stage that appears to need one SHALL be raised as a separate change with its own spec
