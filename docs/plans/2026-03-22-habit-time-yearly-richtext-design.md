# Habit Time Capture + Yearly Vision Rich Text Design

## Context

Two planner-entry enhancements are requested:

1. In the planner's "Today Habits" window, allow users to capture time while marking today's habit complete.
2. In yearly goals, improve image enlarge behavior and make the Vision field rich text.

User-confirmed decisions:

- Habit time capture UX should use popover flow (same interaction model as `HabitTracker`).
- Rich text should apply to Yearly Goals Vision only.

## Goals

- Make planner habit completion capture useful effort time at the same moment of completion.
- Keep habit interaction consistent between planner and habits page.
- Upgrade Yearly Vision from plain text to rich text while preserving auto-save.
- Keep Yearly Goals image enlarge interaction reliable and comfortable on desktop/mobile.

## Non-Goals

- No schema or API contract changes for habits, habit entries, or yearly goals.
- No rich text for individual yearly checklist goals.
- No migration of images into editor-embedded content; image list remains separate.

## Approaches Considered

### Option A (Chosen): Reuse existing components and patterns

- Reuse `TimePopover` in planner habits panel.
- Reuse `RichTextEditor` in yearly goals vision section.
- Keep existing save endpoints and payload structure.

Pros:

- Smallest change set and lower risk.
- UX consistency with current interactions.

Cons:

- Some duplicated habit/today-entry logic remains between two components.

### Option B: Shared hook/service refactor first

- Extract shared habit-entry today logic to utility/hook before feature updates.

Pros:

- Better long-term maintainability.

Cons:

- Larger scope and slower delivery for current request.

### Option C: Rich yearly content model overhaul

- Move yearly vision+images to one structured rich content model.

Pros:

- Most flexible future editing model.

Cons:

- Overkill now; unnecessary data model complexity.

## Selected Architecture

### 1) Planner habit time capture (popover)

Files:

- `src/components/PlannerHabitsPanel.jsx`
- `src/components/PlannerHabitsPanel.css`

Design:

- Add `todayPopover` state (`habitId`, `x`, `y`) in planner panel.
- Clicking `Mark Done` opens `TimePopover` anchored near clicked button.
- On save from popover, create today's entry with selected `timeSpentSeconds`.
- If habit already done today, button remains `Done`; clicking it removes today's entry.
- After mutation, panel reloads and triggers `onDataChange()`.

Data flow:

- Read via `habitService.getAll()` and `habitEntryService.getByHabit()`.
- Write via `habitEntryService.create()` / `habitEntryService.deleteByDate()`.

### 2) Yearly Vision rich text

Files:

- `src/components/YearlyGoals.jsx`
- `src/components/YearlyGoals.css`
- `src/components/RichTextEditor.jsx` (consumption only)

Design:

- Replace Vision textarea with `RichTextEditor`.
- Keep `vision` persisted as HTML string in same `yearly_goals.vision` field.
- Keep 2-second debounce auto-save and blur-save semantics.
- Keep existing goals checklist and image persistence unchanged.

Data flow:

- `yearlyGoalService.getByYear()` loads `vision` HTML.
- `yearlyGoalService.upsert()` stores `vision` HTML unchanged.

### 3) Yearly image enlarge improvements

Files:

- `src/components/YearlyGoals.jsx`
- `src/components/YearlyGoals.css`

Design:

- Preserve lightbox architecture (`lightboxSrc`).
- Ensure robust open/close interactions:
  - open on thumbnail click
  - close on overlay click, close button, and Escape key
- Ensure responsive lightbox image sizing for both desktop and mobile viewports.

## Error Handling

- Habit mutation failures: log error and keep UI in previous state.
- Yearly save failures: log error and keep local editor state so user content is not lost.
- Lightbox failures (invalid image): allow immediate close and avoid lock-in UI states.

## Testing Strategy

- Update `src/__tests__/PlannerHabitsPanel.test.jsx`:
  - popover appears when marking habit done
  - selected time is saved as `timeSpentSeconds`
  - done-state removal still works
- Add/update yearly goals tests:
  - vision rich text renders and persists HTML
  - image thumbnail opens lightbox; close via overlay/button/Escape
- Run targeted tests first, then `npm run test:run`.

## Risks and Mitigations

- Risk: Popover positioning in narrow viewport can clip.
  - Mitigation: keep existing popover positioning behavior from habit page and adjust CSS if needed.
- Risk: Rich text output may include empty wrapper HTML.
  - Mitigation: normalize empty values before save when needed.
- Risk: Existing records with plain text vision.
  - Mitigation: editor accepts both plain text and HTML; no migration required.
