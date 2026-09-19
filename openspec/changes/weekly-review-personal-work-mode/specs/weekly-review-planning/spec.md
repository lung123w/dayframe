# weekly-review-planning Specification (Delta)

## MODIFIED Requirements

### Requirement: Week selection for review

The WeeklyReview view SHALL let the user select which week to review,
defaulting to the current week (Monday–Sunday, week starts on Monday),
with Previous, Next, and "This Week" controls and a visible label of
the selected week's date range. The selected week SHALL apply to the
currently active mode (see "Personal / Work mode split" below).

#### Scenario: Defaults to current week on first open

- **WHEN** the user opens the Review tab for the first time in a
  session
- **THEN** the selected week is the current Monday–Sunday and the
  week range label reflects it, scoped to the active mode

#### Scenario: Navigate to previous week

- **WHEN** the user clicks Previous
- **THEN** the selected week moves back by 7 days and the review
  document for the active mode is reloaded

#### Scenario: Jump back to current week

- **WHEN** the user clicks "This Week"
- **THEN** the selected week resets to the current Monday–Sunday and
  the active mode's document for that week is reloaded

## ADDED Requirements

### Requirement: Personal / Work mode split

The Review tab SHALL support two independent review documents per
week: `mode='personal'` and `mode='work'`. The UI SHALL expose a
Personal/Work segmented control in the week-nav row, right-aligned.
The active mode SHALL persist across week navigation and across
sessions via `localStorage['wr.mode']` (default `'personal'`).

#### Scenario: Segmented control visible on the Review tab

- **WHEN** the user opens the Review tab
- **THEN** the week-nav row shows a `Personal | Work` segmented
  control with the active mode highlighted

#### Scenario: Default mode is personal

- **WHEN** the user opens the Review tab for the first time in a
  session and no `wr.mode` key exists in localStorage
- **THEN** the Personal segment is highlighted and the loaded
  document is the personal review for the selected week

#### Scenario: Switching to Work loads the work document

- **WHEN** the user clicks the Work segment while a week is loaded
- **THEN** the client issues `GET /api/weekly-reviews?weekStart=X&mode=work`
  and renders the work document; the Personal data for the same week
  remains untouched in storage

#### Scenario: Edits in Work mode do not affect Personal data

- **WHEN** the user adds a cleanup task in Work mode and saves
- **THEN** the PUT request body includes `mode:'work'`; switching
  back to Personal shows the personal document unchanged

#### Scenario: Last-selected mode persists across sessions

- **WHEN** the user selects Work, refreshes the page, and opens the
  Review tab again
- **THEN** the Work segment is still highlighted and the work
  document for the current week loads

#### Scenario: Last-selected mode persists across week navigation

- **WHEN** the user selects Work on the current week and clicks
  Previous
- **THEN** the Work segment remains highlighted and the previous
  week's work document loads

### Requirement: API is mode-aware and backward-compatible

The `GET` and `PUT /api/weekly-reviews` endpoints SHALL accept a
`mode` parameter (query for GET, body for PUT) defaulting to
`'personal'` when absent. Server SHALL reject payloads with any other
mode value (HTTP 400). List-style `GET /` (no `weekStart`) SHALL
return rows for all modes, each row carrying its `mode` so the
client can group by mode.

#### Scenario: GET without mode returns personal

- **WHEN** the client calls `GET /api/weekly-reviews?weekStart=X`
  with no mode
- **THEN** the server returns the personal row for that week
  (creating a default doc in memory when none exists)

#### Scenario: GET with mode=work returns the work doc

- **WHEN** the client calls `GET /api/weekly-reviews?weekStart=X&mode=work`
- **THEN** the server returns the work row for that week (default
  doc when none exists)

#### Scenario: PUT without mode writes the personal row

- **WHEN** the client PUTs a review doc without `mode`
- **THEN** the row is written under `mode='personal'`; the work row
  for the same week (if any) is untouched

#### Scenario: PUT with mode=work writes the work row

- **WHEN** the client PUTs a review doc with `mode:'work'`
- **THEN** the row is written under `mode='work'`; the personal row
  is untouched

#### Scenario: PUT with an invalid mode is rejected

- **WHEN** the client PUTs a review doc with `mode` set to anything
  other than `'personal'` or `'work'`
- **THEN** the server responds with HTTP 400 and no row is written

#### Scenario: List endpoint returns rows for all modes

- **WHEN** the client calls `GET /api/weekly-reviews` (no
  `weekStart`)
- **THEN** the response is an array of rows ordered by `weekStart
  DESC`, each carrying its `mode`

### Requirement: Migration preserves existing data as personal

On first boot against a pre-existing database, the server SHALL
backfill every existing row in `weekly_reviews` and `weekly_objectives`
to `mode='personal'` and rebuild both tables so the unique constraint
becomes `UNIQUE(weekStart, mode)`. No row SHALL be destroyed. The
migration SHALL be wrapped in a transaction and SHALL be idempotent
(safe to run on a database that already has the `mode` column).

#### Scenario: First boot against an existing DB backfills personal

- **WHEN** the server starts against an existing `app.db` that has
  rows in `weekly_reviews` and `weekly_objectives` but no `mode`
  column
- **THEN** after the migration runs, every existing row has
  `mode='personal'`; both tables have `UNIQUE(weekStart, mode)`;
  no rows were dropped or duplicated

#### Scenario: Re-running the migration is a no-op

- **WHEN** the server boots against a DB that already has the `mode`
  column and the rebuilt unique constraint
- **THEN** the migration blocks no-op cleanly via try/catch and the
  server starts normally

### Requirement: Habit summary is scoped to the active mode (Phase 2 readiness)

The reflection prompt's habit summary chips SHALL surface only the
habits whose `mode` matches the active review mode (or whose `mode`
is `''`, meaning "both"). In Phase 1, all habits have `mode=''`, so
the visible behaviour is unchanged from today. Phase 2 introduces
the `mode` column on `habits`; this requirement documents the
intent so the Phase-2 proposal can ship without re-discussing it.

#### Scenario: Phase 1 — all habits show in both modes

- **WHEN** no habit has a non-empty `mode` value (Phase 1 default)
- **THEN** the habit summary chips render exactly as they do today,
  regardless of the active review mode

#### Scenario: Phase 2 — Work-tagged habits hide in Personal mode

- **WHEN** a habit has `mode='work'` and the active review mode is
  `'personal'`
- **THEN** that habit SHALL NOT appear in the habit summary chips
  for the Personal review