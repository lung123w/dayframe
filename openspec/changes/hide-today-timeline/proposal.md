# Hide the Timeline panel in the Today view

## Why

Owner request (2026-09-27): *"please also hide the timeline in UX in Dayframe"*.

`DailyTimeline` is a display-only panel rendered by exactly one place — the third column of
the Today view (`.today-timeline-panel`, `src/components/TodayView.jsx`). It groups the day's
tasks that carry a `startTime` onto a fixed 6am–9pm grid and lists the rest under
"No time set". It sets no time and offers no drag-drop, so hiding it removes **no
capability**:

- `startTime` / `endTime` are still edited in `src/components/TaskModal.jsx`.
- Timed tasks are still laid out for the week by `src/components/DayColumn.jsx`.
- `src/utils/recurrence.js` is shared with the Week view and the backlog — not touched.

The panel costs the Today layout 300px and shows the owner nothing the list does not already
show: every task row prints its own time in `.tv-task-time` (`TodayView.jsx:247-252`). Hiding
the panel returns that 300px to the task list — the surface the owner actually works in.

## What Changes

- `TodayView.jsx` stops importing and rendering `DailyTimeline`; the `.today-timeline-panel`
  wrapper goes with it, and the freed space goes to `.today-tasks-panel` (its flex row keeps
  filling whatever is left).
- The row's text column gains a reading-measure cap, so a row that is now ~1130px wide at
  1440px does not become a ~190-character line; the metadata stays flush to the panel's right
  edge.
- **`DailyTimeline.jsx` / `DailyTimeline.css` are kept** — this is a deliberate, reversible
  hide, not a removal. The component's doc comment records that Today intentionally does not
  render it and that re-rendering it is the way back.
- One new test file proves the Today view renders none of the panel's markup, that a task
  with a `startTime` is still rendered, still shows its time and is still clickable into the
  modal, and that the component is still in the repo.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ui-presentation-system` — one **ADDED** requirement
  (`specs/ui-presentation-system/spec.md`): *The Today view is the habit rail plus one
  full-width task list*, with four scenarios (the width the list takes, the readable measure,
  no Timeline markup while a `startTime` still shows in the row, and the ≤768px single column),
  plus *A hidden presentation component is retained with its re-entry recorded*.

  Nothing is MODIFIED or REMOVED: no requirement in `openspec/specs/` mentions the Timeline
  panel or names the Today view's columns (`grep -rin timeline openspec/specs/` → no hits;
  only the archived `ui-modernization-calm-canvas` and
  `relocate-workflow-under-habits-today-tab` artifacts use the word). `openspec validate`
  rejects a change with no delta, and this is the honest one to write — it states the surface
  the owner decided on, so the reversal (re-rendering the panel) is a delta against a
  requirement instead of a silent edit. The decision itself is recorded in
  `.dev_context/DECISION_LOG.md` as ADR-017 (Rule B), where this repo keeps presentation
  decisions.

## Impact

- `src/components/TodayView.jsx` — remove the import and the `.today-timeline-panel` block.
- `src/components/TodayView.css` — remove `.today-timeline-panel` (base rule and its
  `@media (max-width: 768px)` sibling); add the measure cap and the meta's auto margin.
- `src/components/DailyTimeline.jsx`, `src/components/DailyTimeline.css` — doc comment only
  (retained, not dead).
- `src/__tests__/TodayView.noTimeline.test.jsx` — new file.
- `src/__tests__/todayQuickCapture.test.jsx` — delete one inert `vi.mock` line only.
- `openspec/changes/hide-today-timeline/specs/ui-presentation-system/spec.md` — new delta
  (two ADDED requirements on `ui-presentation-system`; see §Capabilities).
- `.dev_context/DECISION_LOG.md`, `.dev_context/ARCHITECTURE.md`, `.dev_context/ROUTE_MAP.md`
  — Rule B updates (design.md §4). `DATA_MODEL.md` untouched (no schema change).
- **No** change under `server/`, to the database, to `src/api.js` or to `src/utils/*`
  (`ui-presentation-system` requirement 9), and no new dependency.
