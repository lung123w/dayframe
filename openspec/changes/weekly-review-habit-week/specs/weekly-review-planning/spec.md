# weekly-review-planning Specification (Delta)

## MODIFIED Requirements

### Requirement: Weekly reflection prompts

The reflection section SHALL present four fixed reflection prompts about the
past week as free-text answer fields, and the answers SHALL persist per
week. The habit-minimum prompt SHALL be accompanied by a read-only habit
summary covering the week immediately preceding the selected week (the
review week: selected weekStart minus 7 days through the day before the
selected week's start), because the review document is keyed to the plan
week while its reflection content concerns the previous week. The summary
title SHALL mark the week as 上週 and name the review week's exact date
range.

#### Scenario: Four reflection prompts are shown

- **WHEN** the reflection section renders
- **THEN** the user sees four prompts: completed goals / performance,
  unexpected obstacles, energy levels, and habit minimums

#### Scenario: Save a reflection answer

- **WHEN** the user types into a reflection answer field
- **THEN** the answer is persisted for that week and restored on reload

#### Scenario: Habit completion summary is surfaced for the habit prompt

- **WHEN** the habit-minimum reflection prompt renders
- **THEN** a read-only summary of the review week's habit completion (the
  week before the selected week, i.e. selected weekStart minus 7 days
  through the day before the selected week's start) is shown alongside the
  answer field, loaded from the existing habit entries data

#### Scenario: Habit summary title names the review week

- **WHEN** the habit summary renders
- **THEN** its title starts with 上週 and contains the review week's exact
  date range, e.g. `上週習慣 (Review week: Sep 12 – Sep 18):`

#### Scenario: Habit summary always trails the selected week

- **WHEN** the user navigates to any week W
- **THEN** the habit entries are fetched for the 7-day window ending the
  day before W's start (W – 7 days through W – 1 day) and the chips reflect
  that range's data