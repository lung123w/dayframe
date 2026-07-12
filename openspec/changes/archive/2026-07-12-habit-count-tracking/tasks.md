## 1. Utilities

- [x] 1.1 Add `formatCount(n)`, `getEntryValue(entry, habit)`, and `getEntryUnit(habit)` to `src/utils/habits.js`. `formatCount` returns `"{n} reps"` (or `"{n} rep"` for 1). `getEntryValue` returns `entry.count` for count habits, `entry.timeSpentSeconds` for duration habits. `getEntryUnit` returns `'reps'` or `'minutes'`.
- [x] 1.2 Extend `src/__tests__/habits.test.js` with cases for each new helper, including legacy habits with no `trackType` (treated as duration) and zero values.

## 2. Reps popover

- [x] 2.1 Create `src/components/RepsPopover.jsx` and `src/components/RepsPopover.css`. Mirror `TimePopover`'s absolute-positioned layout, with a `−  N  +` stepper (clamped at 0), a manual number input, and a "Save" button. Props: `x`, `y`, `onSave(value)`, `onClose()`. Default initial value `0`.
- [x] 2.2 Add `src/__tests__/RepsPopover.test.jsx` covering: clicking `+`/`−` updates the value; manual input overrides the value; "Save" calls `onSave` with the current value; clicking outside calls `onClose`; cannot decrement below 0.

## 3. Habit modal

- [x] 3.1 Update `src/components/HabitModal.jsx` to add a "Track by" radio group ("Duration" / "Repetitions") bound to a new `trackType` state. Default to the existing habit's `trackType` (or `'duration'` for new habits). Include a small inline notice when the user changes `trackType` on a habit that already has entries.
- [x] 3.2 Pass `trackType` through `onSave` so it persists on the habit record.
- [x] 3.3 Extend `src/__tests__/HabitModal.test.jsx` to assert: new habit defaults to duration, switching to repetitions saves `trackType: 'count'`, editing a duration habit preserves the choice by default.

## 4. HabitTracker wiring

- [x] 4.1 In `src/components/HabitTracker.jsx`, swap the popover import and render `RepsPopover` when `habit.trackType === 'count'`. Rename the local "Log time" control to "Add reps" for count habits and call `habitEntryService.create`/`update` with a `count` field instead of `timeSpentSeconds`.
- [x] 4.2 Update the per-habit total line to use `getEntryValue`/`formatCount` for count habits.
- [x] 4.3 Extend `src/__tests__/HabitTracker.test.jsx` to cover: clicking "Mark Done" on a count habit opens `RepsPopover`; saving calls `habitEntryService.create` with `count`; per-habit total renders "N reps" for a count habit.

## 5. PlannerHabitsPanel wiring

- [x] 5.1 In `src/components/PlannerHabitsPanel.jsx`, branch on `habit.trackType` to render `RepsPopover` for count habits and `TimePopover` for duration habits. The `handleToggleToday(habitId, value)` payload should pass `count` or `timeSpentSeconds` accordingly.
- [x] 5.2 Extend `src/__tests__/PlannerHabitsPanel.test.jsx` to cover the count-habit branch.

## 6. Heatmap

- [x] 6.1 Update `src/components/HabitHeatmap.jsx` to take an optional `trackType` prop (or read from the parent) and switch tooltip text and cell intensity off the right value (`count` for count habits, `timeSpentSeconds` for duration).
- [x] 6.2 Verify visually that tooltip shows "1 rep" (singular) and "20 reps" (plural) for count habits.

## 7. Verification

- [x] 7.1 Run `npm run lint` and `npm run test:run`. Both must pass.
- [x] 7.2 Manual smoke test in the dev server: create a count habit ("Push-ups"), mark it done for today with 20 reps, confirm heatmap tooltip shows "20 reps" and total row shows "20 reps".
