# Design: Show Subtasks in DayPanel

**Date:** 2026-03-06
**Branch:** `feature/daypanel-subtasks`

## Problem

The DayPanel (task list sidebar) shows task details — title, description, project, priority, assignee — but does not display subtasks. The Calendar already shows subtask progress badges on events. Users need to open the TaskModal just to see or toggle subtask completion, which is inconvenient for quick daily task management.

## Solution

Add an always-visible, interactive subtask checklist to each task row in DayPanel. Users can toggle subtask completion directly from the panel without opening the modal.

## Design

### Data Flow

1. `App.jsx` passes `subtasks` (the full array from state) and a new `onSubtaskToggle` callback to `DayPanel`.
2. `onSubtaskToggle(subtaskId)` calls `subtaskService.toggleCompleted(id)` then `loadData()` to refresh state — same pattern as `handleSubtaskChange`.

### DayPanel Changes

- Accept `subtasks` and `onSubtaskToggle` props.
- Compute `subtasksByTaskId` via `useMemo` — a `Map` from `parentTaskId` to subtask arrays sorted by `sortOrder`.
- In `renderTask()`, after the description and before the meta row, render the subtask checklist for tasks that have subtasks:
  - A small summary label: `[completed/total]`
  - Each subtask: checkbox + title. Strikethrough + muted when completed.
  - Clicking the checkbox calls `onSubtaskToggle(subtaskId)`.

### Styling

- `.day-subtask-list` — compact checklist, left margin ~20px (aligned under title).
- `.day-subtask-item` — flex row, checkbox + label, 11-12px font, slate colors.
- `.day-subtask-item--done` — strikethrough, muted opacity.
- `.day-subtask-summary` — small count badge consistent with Calendar badge style.

### Files Touched

| File | Change |
|------|--------|
| `src/App.jsx` | Pass `subtasks` + `onSubtaskToggle` to DayPanel (~5 lines) |
| `src/components/DayPanel.jsx` | Accept props, compute subtask map, render checklist (~30 lines) |
| `src/components/DayPanel.css` | Subtask checklist styles (~30 lines) |

### Not Changing

- TaskModal subtask editing (add/delete/rename) stays in the modal.
- Calendar badge display unchanged.
- No schema or service layer changes.
