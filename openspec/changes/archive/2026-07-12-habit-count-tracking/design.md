## Context

`HabitTracker.jsx` and `PlannerHabitsPanel.jsx` log habit completions through a `TimePopover` that captures a duration in seconds. The habit entry persists `timeSpentSeconds` and the heatmap/UI reads it back through `formatTimeSpent`. There is no per-habit unit; duration is assumed for every habit.

The user wants rep-based exercises (push-ups, pull-ups, squats) to be logged as a count instead of a duration. The same tracker needs to carry both shapes without forcing one on every habit.

## Goals / Non-Goals

**Goals:**
- A habit is created or edited with `trackType: 'duration' | 'count'`. Default is `'duration'` for backward compatibility.
- "Mark Done" for a count habit opens a `RepsPopover` with a `[-  N  +]` stepper and a manual number input.
- Existing duration habits are unchanged: `timeSpentSeconds` is still the canonical field, `TimePopover` still opens.
- Heatmap tooltip and per-habit total text reflect the unit.
- Backward compatible: existing entries continue to display correctly; the new `count` field is optional.

**Non-Goals:**
- Per-day target counts ("do 30 today").
- Auto-conversion between duration and count.
- Aggregating count habits in the planner (they still appear in the planner for marking done, but the planner does not totalize them).
- Refusing to edit `trackType` on a habit that already has entries (allow it, but the unit label flips for new entries; old entries render as best as the data allows).

## Decisions

**D1. Add `trackType` to the habit, `count` to the entry — keep `timeSpentSeconds` as-is.**
- The `api.js` services pass through arbitrary fields, so the backend does not need a migration.
- The branching lives in a few well-named utility functions, not scattered through components.

**D2. New `RepsPopover` mirrors `TimePopover`'s layout.**
- Same absolute-positioned popover with a click-outside handler and an onSave callback. The internal control is a `−  N  +` stepper with min 0 and a manual `<input type="number">`. "Save" closes the popover with the current value.
- This keeps a single mental model for users.

**D3. Branch on `habit.trackType` at every read site, with small utilities.**
- `getEntryValue(entry, habit)` returns the right number; `getEntryUnit(habit)` returns `'reps' | 'minutes'`. Components use these instead of open-coding the conditional.

**D4. Backward compatibility: `trackType` defaults to `'duration'` when undefined.**
- Existing habits render as duration. No data migration needed.

## Risks / Trade-offs

- [Mixing units on one habit] → If the user flips `trackType` on a habit that already has entries, old entries show their original unit (since the entry was written under the previous unit) and new entries show the new unit. This is acceptable; users can interpret their own data. Mitigation: surface a small warning in the modal when `trackType` is changed on a habit that has entries.
- [Heatmap cell intensity] → Currently `HabitHeatmap` scales on `timeSpentSeconds` (assumed > 0). For reps, scale on `count`. Risk: a very high rep count saturates the same way a long duration does. Acceptable — the heatmap is intensity-bucketed already.
- [Planner popover scope] → The planner already calls `handleToggleToday(habitId, timeSpentSeconds)`. Swapping to `value` (duration seconds OR count) keeps the call shape; the panel itself does not need to know the unit, only pass through.

## Migration Plan

- No schema migration: new fields are additive and optional.
- Old duration habits continue to work; `trackType` is treated as `'duration'` when missing.

## Open Questions

None.
