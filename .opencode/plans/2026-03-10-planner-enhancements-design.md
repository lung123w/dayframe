# DayFrame Planner Enhancements Design

**Date**: 2026-03-10  
**Status**: Approved

## Overview

Four enhancements to the DayFrame planner:
1. Desktop launch script
2. Drag-and-drop between day columns + reorder within
3. Fix ugly mini-column task display
4. Add start/end time to tasks for meaningful timeline

---

## Enhancement 1: Desktop Launch Script

**Goal**: One-click launch of DayFrame from the desktop.

**Implementation**:
- Create `start-dayframe.bat` (Windows) at project root
- Script checks if port 3001 is in use (server already running)
- If not running, starts `npm start` (production mode) in background
- Waits 3 seconds for server readiness
- Opens `http://localhost:3001` in default browser
- User creates a Windows shortcut to this .bat and places on desktop

**Prerequisites**: `npm run build` must have been run at least once.

---

## Enhancement 2: Drag & Drop (Between Columns + Reorder Within)

**Goal**: Drag tasks between day columns to reschedule. Reorder tasks within a day by dragging.

### Current State
- Backlog sidebar tasks are draggable to day columns (HTML5 DnD)
- Day column tasks are NOT draggable
- No sort order persistence for tasks within a day

### Changes

**Database**:
- Add `sortOrder INTEGER DEFAULT 0` column to `tasks` table (migration in `server/db.js`)

**Server** (`server/routes/tasks.js`):
- Include `sortOrder` in INSERT/UPDATE queries and `parseTask`

**DayColumn.jsx**:
- Make task cards `draggable` with `onDragStart` setting `application/json` data
- Add drop zone indicators between tasks (visual insertion line)
- On drag over, show where the task will land
- Distinguish "same-day reorder" vs "cross-day move" in drop handler

**DailyPlanner.jsx**:
- Update `handleDrop` to handle:
  - Cross-day: update task's `dueDate` + reset `sortOrder`
  - Same-day reorder: update `sortOrder` for affected tasks
- Add API call to batch-update sort orders

**Visual feedback**:
- Dragged task gets reduced opacity
- Target column gets a highlight border
- Drop position shown with a horizontal line indicator

---

## Enhancement 3: Fix Ugly Mini-Column Task Display

**Problem**: In non-expanded (mini) day columns (100-140px wide), task titles display vertically character-by-character because text wraps in the narrow space.

**Fix**:

**DayColumn.jsx** - Simplify mini-column task rendering:
- Mini columns show only: status dot + truncated title (one line)
- No subtasks, meta chips, estimate buttons, or action buttons in mini view
- Compact padding/margins

**DayColumn.css**:
- `.dc-column:not(.dc-column--expanded) .dc-task-title`: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`
- Smaller font size in mini view (11px)
- Reduce task card padding for compact display
- Hide `.dc-task-meta`, `.dc-task-actions`, `.dc-estimate-btn` in mini columns

---

## Enhancement 4: Start Time + End Time for Tasks

**Goal**: Tasks have actual time slots so the DailyTimeline shows a real schedule.

### Database Changes
- Add `startTime TEXT DEFAULT NULL` to `tasks` table (format: `"HH:mm"`, e.g. `"09:30"`)
- Add `endTime TEXT DEFAULT NULL` to `tasks` table

### Server Changes (`server/routes/tasks.js`)
- Include `startTime` and `endTime` in INSERT/UPDATE/parse

### TaskModal.jsx
- Add time inputs (`type="time"`) next to the "Due Date" field
- Labels: "Start Time" and "End Time"
- Optional fields (not required)
- Include in form submission data

### DailyTimeline.jsx
- Tasks WITH `startTime`/`endTime`: position at actual time on the grid
- Tasks WITH `startTime` only + `estimatedMinutes`: derive end from start + estimate
- Tasks WITHOUT times: remain in the "No time set" section (current behavior)
- Handle overlapping tasks (slight offset or side-by-side display)

### DayColumn.jsx
- Show time badge on task cards when `startTime` is set (e.g., "9:30a")

---

## File Change Summary

| File | Enhancement(s) | Type |
|------|---------------|------|
| `start-dayframe.bat` | 1 | New file |
| `server/db.js` | 2, 4 | Migration (add columns) |
| `server/routes/tasks.js` | 2, 4 | Include new fields |
| `src/components/DayColumn.jsx` | 2, 3, 4 | Drag, mini display, time badge |
| `src/components/DayColumn.css` | 2, 3 | Drag styles, mini truncation |
| `src/components/DailyPlanner.jsx` | 2 | Updated drop handler |
| `src/components/DailyTimeline.jsx` | 4 | Real time positioning |
| `src/components/DailyTimeline.css` | 4 | Updated styles |
| `src/components/TaskModal.jsx` | 4 | Time inputs |
| `src/components/TaskModal.css` | 4 | Time input styles |
