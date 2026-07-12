## Why

Habits today only track time spent (`timeSpentSeconds`). For rep-based exercises like push-ups, pull-ups, and squats, the user wants to log a count of repetitions instead of a duration. We need a per-habit choice so the same tracker can carry both "Meditate 15 min" and "Push-ups 30 reps" without forcing one shape on every habit.

## What Changes

- Add a `trackType` field to habits with values `'duration'` (default, current behavior) or `'count'`.
- Add an optional `count` integer field to habit entries, populated only when the habit's `trackType` is `'count'`. Existing `timeSpentSeconds` is preserved as the canonical field for duration habits.
- Add a "Track by" radio group in `HabitModal` so users pick the unit at create/edit time.
- Add a new `RepsPopover` component (± stepper plus a manual number input) and wire it into `HabitTracker` and `PlannerHabitsPanel` for count habits. Duration habits keep using `TimePopover`.
- Update `HabitHeatmap` tooltips and per-habit totals to render reps or minutes based on the habit's `trackType`.
- Add small utilities (`formatCount`, `getEntryValue`, `getEntryUnit`) in `src/utils/habits.js` to keep the branching out of the components.
- Existing duration habits and entries remain untouched; the new field is fully backward compatible.

## Capabilities

### New Capabilities
- `habit-tracking-unit`: Per-habit choice of tracking unit (duration or count) and the rules for how entries, popovers, heatmap tooltips, and totals render under each unit.

### Modified Capabilities
- None. The habits area does not yet have a spec, so this is a greenfield capability.

## Impact

- `src/components/HabitModal.jsx` + `.css` — new radio group
- `src/components/RepsPopover.jsx` + `.css` — new component
- `src/components/HabitTracker.jsx` — branch on `trackType` for the log button and popover
- `src/components/PlannerHabitsPanel.jsx` — branch on `trackType` for the popover
- `src/components/HabitHeatmap.jsx` — tooltip and intensity per `trackType`
- `src/utils/habits.js` — new helpers
- `src/__tests__/HabitModal.test.jsx`, `HabitTracker.test.jsx`, `PlannerHabitsPanel.test.jsx`, `habits.test.js` — extend coverage; add `RepsPopover.test.jsx`
- No database migration is required at the schema layer if `habit` and `habitEntry` are API-served and pass through arbitrary fields (current `api.js` does this); new fields are simply optional.
- No impact on calendar, backlog, or task flows.
