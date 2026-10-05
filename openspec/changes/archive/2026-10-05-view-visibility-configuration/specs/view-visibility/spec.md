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

#### Scenario: Each row states its effect and owns a switch
- **WHEN** the Settings page renders the row for a view
- **THEN** the row SHALL render a control with `role="switch"` whose `aria-checked` is that view's visibility and whose accessible name is `Show <Label> in the navigation`, and the row's status line SHALL read exactly `Shown in the navigation` when the view is visible and exactly `Hidden from the navigation` when it is not

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
- **THEN** only the known ids SHALL be visible, in canonical order, and the navigation SHALL NOT be emptied by the unknown ones — matching is exact, so a near-miss id such as `Today` or `today ` is unknown and SHALL be dropped

#### Scenario: A repeated or out-of-order array behaves as a set
- **WHEN** the stored array repeats a view id (`['today','today']`) or lists ids out of canonical order (`['habits','today']`)
- **THEN** each id SHALL count once and the navigation SHALL render the survivors in the canonical order — `['today','today']` resolves to `['today']`, `['habits','today']` resolves to `['today','habits']`

#### Scenario: Only an array of known view ids is usable
- **WHEN** the stored value is a bare string (`'today'`), a number or an object, or an array whose entries are not known view ids (`[42]`, `[{"view":"today"}]`, `[["today"]]`)
- **THEN** all six views SHALL be visible, because a value that is not an array of exact view ids falls back to the fresh-install set — a bare string SHALL NOT be read as one id

#### Scenario: A very large array cannot widen the set
- **WHEN** the stored array holds thousands of entries (e.g. 5000 view ids, repeats included)
- **THEN** the effective set SHALL be at most the six known ids in canonical order, and no destination SHALL render twice

#### Scenario: A failed write leaves the navigation unchanged
- **WHEN** the write of a permitted toggle to `ui.visibleViews` rejects
- **THEN** the switch SHALL return to its previous state and the page SHALL show exactly `Could not save — the navigation was not changed.`

### Requirement: The Settings entry point and the tools can never be hidden
DayFrame SHALL keep the Settings entry, Backup and Notifications in the More menu at all times, and SHALL provide no visibility control that removes the More menu, the Settings entry, Backup or Notifications.

#### Scenario: The only way in survives every preference
- **WHEN** the visible set is a single view
- **THEN** the More menu SHALL still render, SHALL still open the Settings page, and SHALL still carry Backup and Notifications

#### Scenario: No control exists for them
- **WHEN** the Settings page renders
- **THEN** it SHALL offer six view toggles and no toggle for the More menu, the Settings entry, Backup or Notifications, and the stored array SHALL only ever contain view ids

### Requirement: At least one view stays visible
DayFrame SHALL refuse to hide the last visible view — the only refusing state, since a toggle can only empty a set of size one — SHALL explain the refusal in the Settings page, and SHALL leave the stored preference unchanged.

#### Scenario: The last view is refused
- **WHEN** exactly one view is visible and the user asks to hide it
- **THEN** the switch SHALL stay on, the visible set SHALL remain unchanged, and the page SHALL show exactly `At least one view must stay in the navigation. Turn another view on first.` beside the refused row

#### Scenario: The refusal writes nothing
- **WHEN** the last-visible-view control is used
- **THEN** no value SHALL be written to `ui.visibleViews`

#### Scenario: The explanation clears on the next permitted toggle
- **WHEN** the refusal line is showing and a permitted toggle is then made
- **THEN** the refusal line SHALL disappear

### Requirement: The active view is always a visible view
DayFrame SHALL render the first visible view in the canonical order whenever the active view is one of the six view ids and is not in the visible set — including the cold open when `today` is hidden — and SHALL NOT apply that fallback to the `settings` shell value, which is never a hidden view.

#### Scenario: A cold open with Today hidden lands on the first visible view
- **WHEN** the app loads and `today` is not in the visible set
- **THEN** the first visible view in the canonical order `[today, planner, habits, review, finance, projects]` SHALL render and be marked active, and no hidden destination SHALL appear in the navigation

#### Scenario: The fallback never picks an invisible view
- **WHEN** the visible set changes such that the active view is no longer visible
- **THEN** the app SHALL render a visible view and SHALL NOT render the hidden one

#### Scenario: Opening the Settings page does not bounce
- **WHEN** the user opens the Settings page (`activeView` is the `settings` shell value)
- **THEN** the Settings page SHALL render and stay rendered, because the fallback applies to the six view ids only

#### Scenario: The fallback's only reachable trigger is the cold open
- **WHEN** `today` is not in the stored visible set and the app loads with it (the cold open's value)
- **THEN** the first visible view SHALL render; and no in-app control SHALL hide the view currently rendered, because the visibility controls live on the Settings page, which no preference can hide

### Requirement: The keyboard layer offers only visible views
DayFrame's `g`-prefix view chord and its command palette SHALL offer and perform navigation only to visible views, and the palette's shortcut footer SHALL NOT advertise a shortcut for a hidden view; the visible set is never empty, so the palette always lists at least one view and there is no all-hidden state to handle.

#### Scenario: The chord does nothing for a hidden view
- **WHEN** the user presses the `g` chord and then the view letter of a hidden view
- **THEN** the app SHALL NOT change view, SHALL leave the current view active, and SHALL NOT consume the keystroke — the event's `defaultPrevented` stays false

#### Scenario: The chord still works for a visible view
- **WHEN** the user presses the `g` chord and then the view letter of a visible view
- **THEN** the app SHALL navigate to that view

#### Scenario: The palette omits a hidden view
- **WHEN** the command palette opens with one or more views hidden
- **THEN** it SHALL list no command for a hidden view, and it SHALL still list the visible views and the focus-the-capture-line command

#### Scenario: The footer advertises only visible shortcuts
- **WHEN** the palette's shortcut footer renders with one or more views hidden
- **THEN** the view-shortcut row SHALL name only the visible views and their letters, and SHALL omit every hidden view

#### Scenario: Nothing hidden means the footer is unchanged
- **WHEN** all six views are visible (a fresh install)
- **THEN** the footer SHALL render the same eight rows with the same keys and labels as before this change, and its view-shortcut row SHALL read exactly `g → t / w / h / r / f / p` with the label `Today · Week · Habits · Review · Finance · Projects`
