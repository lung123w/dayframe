# habit-tracking-unit Specification (Delta — Phase 2 roadmap)

## ADDED Requirements

### Requirement: Habit mode tag (Phase 2 roadmap)

A habit MUST accept an optional `mode` tag with values `'personal'`,
`'work'`, or `''` (empty = "shows in both modes"). When Phase 2 ships,
the habit's review summary SHALL scope itself to that mode. This
requirement documents the schema intent for the Phase 1 proposal
(`weekly-review-personal-work-mode`) so the eventual Phase 2 proposal
can build on it without re-discussing the data shape.

**Phase 1 status:** the `mode` column is **NOT** added in
`weekly-review-personal-work-mode`; behaviour change is also deferred
to Phase 2. The scenarios below are target requirements for Phase 2,
not acceptance criteria for Phase 1.

#### Scenario: Phase 2 — Creating a Personal-only habit

- **WHEN** the user creates a habit and selects `mode='personal'`
- **THEN** the saved habit has `mode: 'personal'`; the Weekly
  Review's habit summary chips show it only when the active mode is
  `'personal'`

#### Scenario: Phase 2 — Creating a Work-only habit

- **WHEN** the user creates a habit and selects `mode='work'`
- **THEN** the saved habit has `mode: 'work'`; the Weekly Review's
  habit summary chips show it only when the active mode is `'work'`

#### Scenario: Phase 2 — Default mode is both (`''`)

- **WHEN** the user creates a habit without picking a mode
- **THEN** the saved habit has `mode: ''` and shows in both modes'

  habit summary chips (today's behaviour)

#### Scenario: Phase 2 — HabitModal exposes the mode choice

- **WHEN** the user opens the HabitModal to create or edit a habit
- **THEN** a "Mode" control offers Personal / Work / Both, with
  "Both" selected by default

#### Scenario: Phase 2 — Review habit summary filters by active mode

- **WHEN** the user opens the Weekly Review in Work mode
- **THEN** habit summary chips include only habits where
  `mode = 'work'` or `mode = ''`