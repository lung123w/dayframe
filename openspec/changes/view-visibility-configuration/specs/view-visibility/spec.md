## ADDED Requirements

### Requirement: The navigation shows only the views the user has kept visible
DayFrame SHALL let the user choose, on a Settings page, which of the six views `today`, `planner`, `habits`, `review`, `finance` and `projects` appear in the navigation, and SHALL render only the chosen views in the top strip and the More menu.

#### Scenario: An unset or unusable preference shows every view
- **WHEN** `ui.visibleViews` is unset, not an array, empty, or contains no known view id
- **THEN** all six views SHALL appear in the navigation, exactly as they do on a fresh install

#### Scenario: The strip shows only the visible main views
- **WHEN** any of `today`, `planner`, `habits` or `review` is not in the visible set
- **THEN** its top-strip destination SHALL NOT render, and the remaining visible destinations SHALL be unchanged in label, order and active marking

#### Scenario: The More menu shows only the visible overflow views
- **WHEN** `finance` or `projects` is not in the visible set
- **THEN** its item SHALL NOT render in the More menu

#### Scenario: Visibility never reorders
- **WHEN** the visible set is any subset of the six views
- **THEN** the navigation SHALL present them in the canonical order `[today, planner, habits, review, finance, projects]`, and no reordering control SHALL be offered

#### Scenario: The Settings page lists exactly the configurable views
- **WHEN** the Settings page renders
- **THEN** it SHALL present one show/hide control for each of the six view ids and SHALL present no control for the More menu, Settings, Backup or Notifications

### Requirement: The visible-view preference is stored server-side under one key
DayFrame SHALL persist the visible-view set as a JSON array of view ids under the settings key `ui.visibleViews`, read and written through the existing `GET`/`PUT /api/settings/:key` route, and SHALL resolve that value before the navigation renders for the first time.

#### Scenario: A toggle is persisted
- **WHEN** the user shows or hides a view on the Settings page
- **THEN** the resulting array SHALL be written to `ui.visibleViews`, and the navigation SHALL render the same set after a reload

#### Scenario: No hidden view is rendered even briefly
- **WHEN** the app loads with a stored preference that excludes a view
- **THEN** that view's destination SHALL NOT render on any paint, including the first

#### Scenario: Unknown ids are dropped, known ids survive
- **WHEN** the stored array mixes known and unknown view ids
- **THEN** only the known ids SHALL be visible, in canonical order, and the navigation SHALL NOT be emptied by the unknown ones

### Requirement: The Settings entry point and the tools can never be hidden
DayFrame SHALL keep the Settings entry, Backup and Notifications in the More menu at all times, and SHALL provide no visibility control that removes the More menu, the Settings entry, Backup or Notifications.

#### Scenario: The only way in survives every preference
- **WHEN** the visible set is a single view
- **THEN** the More menu SHALL still render, SHALL still open the Settings page, and SHALL still carry Backup and Notifications

#### Scenario: No control exists for them
- **WHEN** the Settings page renders
- **THEN** it SHALL offer six view toggles and no toggle for the More menu, the Settings entry, Backup or Notifications, and the stored array SHALL only ever contain view ids

### Requirement: At least one view stays visible
DayFrame SHALL refuse to hide the last visible view, SHALL explain the refusal in the Settings page, and SHALL leave the stored preference unchanged.

#### Scenario: The last view is refused
- **WHEN** one view is visible and the user asks to hide it
- **THEN** the switch SHALL stay on, the visible set SHALL remain unchanged, and the page SHALL show an explanation that at least one view must stay in the navigation

#### Scenario: The refusal writes nothing
- **WHEN** the last-visible-view control is used
- **THEN** no value SHALL be written to `ui.visibleViews`

### Requirement: The active view is always a visible view
DayFrame SHALL render the first visible view in the canonical order whenever the active view is not in the visible set, including the cold open when `today` is hidden.

#### Scenario: A cold open with Today hidden lands on the first visible view
- **WHEN** the app loads and `today` is not in the visible set
- **THEN** the first visible view in the canonical order `[today, planner, habits, review, finance, projects]` SHALL render and be marked active, and no hidden destination SHALL appear in the navigation

#### Scenario: The fallback never picks an invisible view
- **WHEN** the visible set changes such that the active view is no longer visible
- **THEN** the app SHALL render a visible view and SHALL NOT render the hidden one

### Requirement: The keyboard layer offers only visible views
DayFrame's `g`-prefix view chord and its command palette SHALL offer and perform navigation only to visible views, and the palette's shortcut footer SHALL NOT advertise a shortcut for a hidden view.

#### Scenario: The chord does nothing for a hidden view
- **WHEN** the user presses the `g` chord and then the view letter of a hidden view
- **THEN** the app SHALL NOT change view and SHALL leave the current view active

#### Scenario: The chord still works for a visible view
- **WHEN** the user presses the `g` chord and then the view letter of a visible view
- **THEN** the app SHALL navigate to that view

#### Scenario: The palette omits a hidden view
- **WHEN** the command palette opens with one or more views hidden
- **THEN** it SHALL list no command for a hidden view, and it SHALL still list the visible views and the focus-the-capture-line command

#### Scenario: The footer advertises only visible shortcuts
- **WHEN** the palette's shortcut footer renders with one or more views hidden
- **THEN** the view-shortcut row SHALL name only the visible views and their letters, and SHALL omit every hidden view
