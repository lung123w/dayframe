# Remove "Plan My Day" (daily planning session)

## Why

The "Plan My Day" header button opens the `DailyPlanningModal`, a screen that
groups pending tasks into Overdue / Due Today / Upcoming (next 7 days), lets
the user tick which ones to focus on, and writes a new `todayOrder` array on
"Start Day". It is a redundant planning path: the Today view already does the
same job natively — quick-capture bar, the Daily Workflow section, and direct
drag/arrow reordering of today's tasks, all persisted through the same
`todayOrder` state that the modal writes. Anderson approved removing the
feature outright on 2026-09-13 (decision doc
`docs/plans/2026-09-13-remove-plan-my-day.md`).

Removing it:

- declutters the header (the button is always visible above every view),
- deletes ~370 lines of frontend surface (component, styles, util, test)
  plus the App.jsx wiring,
- leaves `todayOrder`, `handleTodayOrderChange`, `syncTodayOrder`,
  Today-view reorder and planner-today sync completely untouched.

Exploration verified there is no breakage: no keyboard shortcut, no sidebar
entry point, no other component references the modal, and `mergeOrder`
degrades gracefully to due-date order when `todayOrder` is empty.

## What Changes

All changes are deletions. Zero server/API changes.

- `src/App.jsx`
  - Remove `import DailyPlanningModal ...` (L8) and `FaCalendarCheck` from
    the react-icons import (L16).
  - Remove `showPlanningModal` state (L40) and `handlePlanningConfirm`
    (L215-220).
  - Remove the "Plan My Day" button block (L337-345, incl. the comment).
  - Remove the `{showPlanningModal && <DailyPlanningModal ... />}` render
    block (L464-472).
- Delete `src/components/DailyPlanningModal.jsx` (126 lines) and
  `src/components/DailyPlanningModal.css` (224 lines).
- Delete `src/utils/planningGroups.js` — dead after removal (its only
  consumer is the modal).
- Delete `src/__tests__/DailyPlanningModal.test.js` — tests only
  `groupTasksByUrgency` (8 cases), not the modal.
- `src/App.css` — remove the "Plan My Day button" block (L337-361).
- `README.md` — remove the "### Plan My Day" section (L40-44).
- OpenSpec — delta marks all three `daily-planning-session` requirements as
  REMOVED. After archive, the spec directory is deleted: its only unique
  content is the button/modal requirements; the quick-capture / Daily
  Workflow sentence inside requirement 3 is fully covered by the dedicated
  `today-quick-capture` and `daily-workflow-session` specs. Archived changes
  referencing the feature stay as historical record.

## Capabilities

### Removed Capabilities

- `daily-planning-session`: The "Plan My Day" button and the
  `DailyPlanningModal` are removed. Planning the day happens directly in the
  Today view (quick-capture, Daily Workflow, drag/arrow reorder, all already
  persisting to `todayOrder`).

## Impact

- **New files**: `openspec/changes/remove-plan-my-day/` (this folder —
  proposal, tasks, spec delta).
- **Deleted files**: `src/components/DailyPlanningModal.jsx`,
  `src/components/DailyPlanningModal.css`, `src/utils/planningGroups.js`,
  `src/__tests__/DailyPlanningModal.test.js`.
- **Modified files**: `src/App.jsx` (remove wiring), `src/App.css` (remove
  button styles), `README.md` (remove section).
- **Spec deltas**: `specs/daily-planning-session/spec.md` — all requirements
  REMOVED.
- **No new npm packages. No server/API changes.** `todayOrder` stays a plain
  settings key; existing stored `todayOrder` data is harmless leftover (the
  Today view still reads it).
- **Backward compatibility**
  - Empty `todayOrder` degrades to all pending tasks in due-date order — no
    empty Today view, no crash.
  - Existing tests never render the modal (`App.test.jsx` checks header +
    stat cards; `DailyPlanningModal.test.js` tests only the util and is
    deleted), so the suite keeps passing with 8 fewer cases.
  - Sidebar "Today" nav remains the entry point to the Today view (the
    modal's `setActiveView('today')` convenience is not needed).
- **Master-WIP coordination**: `master` currently carries **uncommitted**
  Weekly Review WORK-mode work (`WeeklyReview*.jsx`, `WeeklyObjectives.jsx`,
  `src/api.js`, `server/*`, `wrModeStorage.test.jsx`). This change touches
  only `App.jsx`, `App.css`, `README.md`, and the files listed for deletion —
  zero overlap with the WIP, so no merge hotspot. The WIP must NOT be
  touched, committed, or rebased by implementers.

## Open coordination note (do NOT silently bury)

The exploration & decision doc is
`docs/plans/2026-09-13-remove-plan-my-day.md` (verified current-state line
numbers, dependency analysis, risks, and the manual smoke plan). Line
numbers quoted in this proposal match the repo at proposal time; the
implementer should locate by symbol if the file drifts. `openspec archive
remove-plan-my-day` runs after all tasks done + human sign-off (dev profile),
and is what deletes the now-empty `daily-planning-session` spec dir.