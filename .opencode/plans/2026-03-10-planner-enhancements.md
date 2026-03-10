# DayFrame Planner Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add desktop launch script, drag-and-drop between day columns + reorder, fix mini-column display, and add start/end time to tasks.

**Architecture:** Backend changes add `sortOrder`, `startTime`, `endTime` columns to tasks table and update CRUD routes. Frontend changes modify DayColumn, DailyPlanner, DailyTimeline, and TaskModal components. A Windows batch file provides one-click launch.

**Tech Stack:** React 19, Express 5, better-sqlite3, date-fns, Vite 8, HTML5 Drag and Drop API

---

### Task 1: Create Git Branch

**Step 1: Create and switch to feature branch**

```bash
git checkout -b feat/planner-enhancements
```

**Step 2: Verify branch**

```bash
git branch --show-current
```

Expected: `feat/planner-enhancements`

---

### Task 2: Database Migration - Add New Columns

**Files:**
- Modify: `server/db.js:102-107`

**Step 1: Add migration for `sortOrder`, `startTime`, `endTime` columns**

Add after the existing `estimatedMinutes` migration block (line 107) in `server/db.js`:

```javascript
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN sortOrder INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN startTime TEXT DEFAULT NULL`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN endTime TEXT DEFAULT NULL`);
} catch (e) {
  // Column already exists
}
```

**Step 2: Verify server starts**

Run: `npm run dev:server`
Expected: Server starts on port 3001 without errors. Stop with Ctrl+C.

**Step 3: Commit**

```bash
git add server/db.js
git commit -m "feat: add sortOrder, startTime, endTime columns to tasks table"
```

---

### Task 3: Update Server Task Routes

**Files:**
- Modify: `server/routes/tasks.js`

**Step 1: Update `parseTask` to include new fields**

The new fields (`sortOrder`, `startTime`, `endTime`) are plain values (not JSON), so they pass through automatically from the row. No change needed to `parseTask`.

**Step 2: Update POST handler to include new fields**

In the POST route (around line 37), update the INSERT statement:

```javascript
router.post('/', (req, res) => {
  const b = req.body;
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, descriptionImages, dueDate, priority, status,
      projectId, assignedTo, isRecurring, recurrencePattern, statusOverrides, statusFromOverrides,
      estimatedMinutes, sortOrder, startTime, endTime, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    b.title || '',
    b.description || '',
    JSON.stringify(b.descriptionImages || []),
    b.dueDate || null,
    b.priority || 'medium',
    b.status || 'todo',
    b.projectId || null,
    JSON.stringify(b.assignedTo || []),
    b.isRecurring ? 1 : 0,
    b.recurrencePattern ? JSON.stringify(b.recurrencePattern) : null,
    JSON.stringify(b.statusOverrides || {}),
    JSON.stringify(b.statusFromOverrides || []),
    b.estimatedMinutes ?? null,
    b.sortOrder ?? 0,
    b.startTime || null,
    b.endTime || null,
    now,
    now
  );
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(parseTask(newTask));
});
```

**Step 3: Update PUT handler to include new fields**

In the PUT route (around line 73), update the UPDATE statement:

```javascript
const stmt = db.prepare(`
  UPDATE tasks SET title=?, description=?, descriptionImages=?, dueDate=?, priority=?, status=?,
    projectId=?, assignedTo=?, isRecurring=?, recurrencePattern=?, statusOverrides=?,
    statusFromOverrides=?, estimatedMinutes=?, sortOrder=?, startTime=?, endTime=?, updatedAt=?
  WHERE id=?
`);
stmt.run(
  merged.title,
  merged.description,
  JSON.stringify(merged.descriptionImages || []),
  merged.dueDate || null,
  merged.priority,
  merged.status,
  merged.projectId || null,
  JSON.stringify(merged.assignedTo || []),
  merged.isRecurring ? 1 : 0,
  merged.recurrencePattern ? JSON.stringify(merged.recurrencePattern) : null,
  JSON.stringify(merged.statusOverrides || {}),
  JSON.stringify(merged.statusFromOverrides || []),
  merged.estimatedMinutes !== undefined ? merged.estimatedMinutes : (existing.estimatedMinutes ?? null),
  merged.sortOrder ?? existing.sortOrder ?? 0,
  merged.startTime !== undefined ? merged.startTime : (existing.startTime || null),
  merged.endTime !== undefined ? merged.endTime : (existing.endTime || null),
  now,
  req.params.id
);
```

**Step 4: Verify server starts and API works**

Run: `npm run dev:server`
Expected: No errors. Test with `curl http://localhost:3001/api/tasks` - tasks should include `sortOrder`, `startTime`, `endTime` fields.

**Step 5: Commit**

```bash
git add server/routes/tasks.js
git commit -m "feat: include sortOrder, startTime, endTime in task CRUD routes"
```

---

### Task 4: Fix Mini-Column Display (Enhancement 3)

**Files:**
- Modify: `src/components/DayColumn.jsx:113-207` (renderTask function)
- Modify: `src/components/DayColumn.css`

**Step 1: Update renderTask in DayColumn.jsx for mini columns**

The `renderTask` function currently renders the full card for both expanded and mini views. Add early return for mini (non-expanded) columns.

In `DayColumn.jsx`, at the beginning of the `renderTask` function (after the variable declarations around line 120), add a mini view branch:

```jsx
const renderTask = (task) => {
  const project = getProject(task.projectId);
  const isCompleted = task.status === 'completed';
  const taskKey = task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id;

  // Mini column: compact single-line display
  if (!expanded) {
    return (
      <div
        key={taskKey}
        className={`dc-task dc-task--mini${isCompleted ? ' dc-task--done' : ''}`}
        style={{ borderLeftColor: project?.color || '#E2E8F0' }}
        title={task.title}
      >
        <button
          className="dc-status-btn"
          onClick={() => onStatusUpdate(task, STATUS_CYCLE[task.status], task.isRecurringInstance ? 'single' : undefined)}
        >
          {STATUS_ICON[task.status]}
        </button>
        <span className={`dc-task-title dc-task-title--mini${isCompleted ? ' dc-task-title--done' : ''}`}>
          {task.title}
        </span>
      </div>
    );
  }

  // ... rest of the existing expanded renderTask code (keep everything after this point unchanged)
```

Remove the existing variable declarations that are only needed in expanded mode (assignees, subtaskTaskId, taskSubtasks, etc.) from before the mini branch and move them into the expanded section (after the mini return). The full expanded card code stays as-is.

**Step 2: Add mini task CSS in DayColumn.css**

Add at the end of `DayColumn.css`:

```css
/* Mini column task styles */
.dc-task--mini {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  border-left: 3px solid #E2E8F0;
  margin-bottom: 2px;
  cursor: default;
}
.dc-task--mini:hover { background: #F8FAFC; }

.dc-task-title--mini {
  font-size: 11px;
  font-weight: 600;
  color: #1E293B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
```

**Step 3: Verify in browser**

Run: `npm run dev`
Expected: Mini day columns show compact one-line task cards with truncated titles and "..." for overflow. No more vertical character-by-character text.

**Step 4: Commit**

```bash
git add src/components/DayColumn.jsx src/components/DayColumn.css
git commit -m "fix: compact mini-column task display with text truncation"
```

---

### Task 5: Drag & Drop Between Day Columns (Enhancement 2)

**Files:**
- Modify: `src/components/DayColumn.jsx`
- Modify: `src/components/DayColumn.css`
- Modify: `src/components/DailyPlanner.jsx`

**Step 1: Make task cards draggable in DayColumn.jsx**

In both the mini task card and the expanded task card, add `draggable` and `onDragStart`:

For the mini task card (added in Task 4), update the div:

```jsx
<div
  key={taskKey}
  className={`dc-task dc-task--mini${isCompleted ? ' dc-task--done' : ''}`}
  style={{ borderLeftColor: project?.color || '#E2E8F0' }}
  title={task.title}
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.isRecurringInstance ? task.recurringSourceId : task.id, sourceDate: dateStr }));
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dc-task--dragging');
  }}
  onDragEnd={(e) => {
    e.currentTarget.classList.remove('dc-task--dragging');
  }}
>
```

For the expanded task card (the existing `.dc-task` div around line 123 of the original), add the same `draggable`, `onDragStart`, and `onDragEnd` attributes.

**Step 2: Add drag state CSS**

Add to `DayColumn.css`:

```css
/* Drag states */
.dc-task--dragging {
  opacity: 0.4;
}

.dc-column--drag-over {
  border-color: #3B82F6;
  background: #EFF6FF;
}

.dc-drop-indicator {
  height: 2px;
  background: #3B82F6;
  border-radius: 1px;
  margin: 2px 8px;
  transition: opacity 0.15s;
}
```

**Step 3: Add drop indicator and drag-over handling in DayColumn.jsx**

Add state for the drop indicator position. At the top of the DayColumn component, add:

```jsx
const [dragOverIndex, setDragOverIndex] = React.useState(-1);
```

Add a function to handle drag over on task items to determine insertion index:

```jsx
const handleTaskDragOver = (e, index) => {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  const rect = e.currentTarget.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  setDragOverIndex(e.clientY < midY ? index : index + 1);
};

const handleColumnDragLeave = (e) => {
  // Only reset if leaving the column entirely
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setDragOverIndex(-1);
  }
};
```

Update the column div to include drag-over visual state and the leave handler:

```jsx
<div
  className={`dc-column${expanded ? ' dc-column--expanded' : ''}${isTodayDate ? ' dc-column--today' : ''}${dragOverIndex >= 0 ? ' dc-column--drag-over' : ''}`}
  onDragOver={onDragOver}
  onDrop={(e) => { setDragOverIndex(-1); onDrop(e, dragOverIndex); }}
  onDragLeave={handleColumnDragLeave}
  data-date={dateStr}
>
```

In the task list rendering, insert drop indicators:

```jsx
{todoTasks.map((task, idx) => (
  <React.Fragment key={task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id}>
    {dragOverIndex === idx && <div className="dc-drop-indicator" />}
    <div onDragOver={(e) => handleTaskDragOver(e, idx)}>
      {renderTask(task)}
    </div>
  </React.Fragment>
))}
{dragOverIndex === todoTasks.length && <div className="dc-drop-indicator" />}
```

**Step 4: Update DailyPlanner.jsx drop handler**

Update `handleDrop` to accept the drop index and handle both cross-day moves and within-day reorder. Also update `onDrop` prop passed to DayColumn:

```jsx
const handleDrop = useCallback(async (e, dropIndex) => {
  e.preventDefault();
  const dateStr = e.currentTarget.getAttribute('data-date');
  if (!dateStr) return;
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data.taskId) {
      const taskId = data.taskId;
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const sourceDate = data.sourceDate; // undefined if from backlog

      if (sourceDate && sourceDate === dateStr && dropIndex >= 0) {
        // Same-day reorder: update sortOrder for tasks on this day
        const dayTasks = tasks
          .filter(t => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            const ds = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
            return ds === dateStr && t.status !== 'completed';
          })
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        const currentIndex = dayTasks.findIndex(t => t.id === taskId);
        if (currentIndex === -1 || currentIndex === dropIndex) return;

        // Reorder
        const reordered = [...dayTasks];
        const [moved] = reordered.splice(currentIndex, 1);
        reordered.splice(dropIndex > currentIndex ? dropIndex - 1 : dropIndex, 0, moved);

        // Update sortOrder for all affected tasks
        for (let i = 0; i < reordered.length; i++) {
          if (reordered[i].sortOrder !== i) {
            await taskService.update(reordered[i].id, { sortOrder: i });
          }
        }
        if (onDataChange) onDataChange();
      } else {
        // Cross-day move or from backlog: update dueDate
        onAssignDate(task, new Date(dateStr + 'T12:00:00'));
      }
    }
  } catch {
    // Invalid drag data
  }
}, [tasks, onAssignDate, onDataChange]);
```

Update the DayColumn `onDrop` prop - since DayColumn now passes dropIndex, the signature is already updated above.

**Step 5: Update DayColumn sort order**

In `DayColumn.jsx`, update the `dayTasks` useMemo to sort by `sortOrder` as the primary sort, then priority:

```javascript
return result.sort((a, b) => {
  const orderA = a.sortOrder ?? 0;
  const orderB = b.sortOrder ?? 0;
  if (orderA !== orderB) return orderA - orderB;
  return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
});
```

**Step 6: Verify in browser**

Run: `npm run dev`
Expected:
- Task cards show a grab cursor and can be dragged
- Dragging from one day column to another changes the task's due date
- Dragging within the same day column reorders tasks
- Drop indicator line appears where the task will be inserted
- Backlog drag still works

**Step 7: Commit**

```bash
git add src/components/DayColumn.jsx src/components/DayColumn.css src/components/DailyPlanner.jsx
git commit -m "feat: drag-and-drop between day columns and reorder within"
```

---

### Task 6: Add Start/End Time to TaskModal (Enhancement 4)

**Files:**
- Modify: `src/components/TaskModal.jsx`
- Modify: `src/components/TaskModal.css`

**Step 1: Add startTime and endTime to form state**

In `TaskModal.jsx`, update the `formData` initial state (around line 9):

Add to the initial state object:
```javascript
startTime: '',
endTime: '',
```

**Step 2: Update useEffect for editing an existing task**

In the `useEffect` that sets formData from the task prop (around line 152), add:
```javascript
startTime: task.startTime || '',
endTime: task.endTime || '',
```

**Step 3: Add time inputs to the form**

After the existing "Due Date" / "Priority" / "Est. Time" form-row (around line 503), add a new row:

```jsx
<div className="form-row">
  <div className="form-group">
    <label htmlFor="startTime">Start Time</label>
    <input
      type="time"
      id="startTime"
      name="startTime"
      value={formData.startTime}
      onChange={handleChange}
      className="form-input"
    />
  </div>
  <div className="form-group">
    <label htmlFor="endTime">End Time</label>
    <input
      type="time"
      id="endTime"
      name="endTime"
      value={formData.endTime}
      onChange={handleChange}
      className="form-input"
    />
  </div>
</div>
```

**Step 4: Include startTime/endTime in handleSubmit**

In `handleSubmit` (around line 273), add to the `taskData` object:
```javascript
startTime: formData.startTime || null,
endTime: formData.endTime || null,
```

**Step 5: Verify in browser**

Run: `npm run dev`
Expected: Task create/edit modal shows "Start Time" and "End Time" fields with native time pickers. Saving a task with times persists them to the database.

**Step 6: Commit**

```bash
git add src/components/TaskModal.jsx src/components/TaskModal.css
git commit -m "feat: add start/end time inputs to task modal"
```

---

### Task 7: Update DailyTimeline for Real Time Positioning (Enhancement 4)

**Files:**
- Modify: `src/components/DailyTimeline.jsx`
- Modify: `src/components/DailyTimeline.css`

**Step 1: Update DailyTimeline.jsx to position tasks by actual time**

Replace the current auto-stacking logic with time-aware positioning:

```jsx
import React, { useMemo } from 'react';
import { FaClock } from 'react-icons/fa';
import { generateRecurringTasks } from '../utils/recurrence';
import './DailyTimeline.css';

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm

function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTimeLabel(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'p' : 'a';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

export default function DailyTimeline({ dateStr, tasks, projects }) {
  const dayTasks = useMemo(() => {
    if (!dateStr) return [];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d);
    const dayEnd = new Date(y, m - 1, d + 1);

    const result = [];
    for (const task of tasks) {
      if (task.isRecurring && task.dueDate) {
        result.push(...generateRecurringTasks(task, dayStart, dayEnd));
      } else if (task.dueDate && toLocalDateStr(task.dueDate) === dateStr) {
        result.push(task);
      }
    }
    return result.filter(t => t.status !== 'completed');
  }, [tasks, dateStr]);

  const GRID_START = 6 * 60; // 6am in minutes
  const GRID_END = 21 * 60;  // 9pm in minutes
  const totalMinutes = GRID_END - GRID_START;

  // Separate: tasks with times vs without
  const timedTasks = useMemo(() => {
    return dayTasks
      .filter(t => t.startTime)
      .map(t => {
        const startMin = timeToMinutes(t.startTime);
        let endMin;
        if (t.endTime) {
          endMin = timeToMinutes(t.endTime);
        } else if (t.estimatedMinutes) {
          endMin = startMin + t.estimatedMinutes;
        } else {
          endMin = startMin + 30; // default 30min block
        }
        return { task: t, startMin, endMin, duration: endMin - startMin };
      })
      .sort((a, b) => a.startMin - b.startMin);
  }, [dayTasks]);

  const untimedTasks = dayTasks.filter(t => !t.startTime);

  const getProject = id => projects.find(p => p.id === id);

  // Current time indicator
  const now = new Date();
  const [dy, dm, dd] = dateStr ? dateStr.split('-').map(Number) : [0, 0, 0];
  const isToday = now.getFullYear() === dy && now.getMonth() + 1 === dm && now.getDate() === dd;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffset = isToday && nowMinutes >= GRID_START && nowMinutes <= GRID_END
    ? ((nowMinutes - GRID_START) / totalMinutes) * 100
    : null;

  return (
    <div className="tl-container">
      <div className="tl-header">
        <FaClock className="tl-header-icon" />
        <span className="tl-header-title">Timeline</span>
      </div>

      {untimedTasks.length > 0 && (
        <div className="tl-untimed">
          <span className="tl-untimed-label">No time set:</span>
          {untimedTasks.map(t => (
            <div key={t.isRecurringInstance ? `${t.id}-${t.instanceDate}` : t.id} className="tl-untimed-task">
              <span className="tl-untimed-dot" style={{ background: getProject(t.projectId)?.color || '#94A3B8' }} />
              <span className="tl-untimed-name">{t.title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="tl-grid">
        {HOURS.map(hour => {
          const offset = ((hour * 60 - GRID_START) / totalMinutes) * 100;
          return (
            <div key={hour} className="tl-hour" style={{ top: `${offset}%` }}>
              <span className="tl-hour-label">{hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'p' : 'a'}</span>
              <div className="tl-hour-line" />
            </div>
          );
        })}

        {/* Current time indicator */}
        {nowOffset !== null && (
          <div className="tl-now-line" style={{ top: `${nowOffset}%` }}>
            <div className="tl-now-dot" />
            <div className="tl-now-rule" />
          </div>
        )}

        {timedTasks.map(({ task, startMin, endMin, duration }) => {
          const project = getProject(task.projectId);
          const top = ((startMin - GRID_START) / totalMinutes) * 100;
          const height = Math.max((duration / totalMinutes) * 100, 2.5);
          return (
            <div
              key={task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id}
              className="tl-block"
              style={{
                top: `${top}%`,
                height: `${height}%`,
                borderLeftColor: project?.color || '#3B82F6',
                background: (project?.color || '#3B82F6') + '15',
              }}
            >
              <span className="tl-block-time">{formatTimeLabel(task.startTime)}</span>
              <span className="tl-block-title">{task.title}</span>
              <span className="tl-block-duration">{formatMinutes(duration)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Add current-time indicator CSS to DailyTimeline.css**

Add at the end of `DailyTimeline.css`:

```css
/* Current time indicator */
.tl-now-line {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  height: 0;
  z-index: 2;
}
.tl-now-dot {
  width: 8px;
  height: 8px;
  background: #EF4444;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 24px;
}
.tl-now-rule {
  flex: 1;
  height: 2px;
  background: #EF4444;
}

.tl-block-duration {
  font-size: 9px;
  color: #64748B;
}
```

**Step 3: Verify in browser**

Run: `npm run dev`
Expected:
- Tasks with startTime/endTime appear at correct positions on timeline
- Tasks without times still appear in "No time set" section
- A red line shows the current time (if today is selected)
- Timeline spans 6am to 8pm

**Step 4: Commit**

```bash
git add src/components/DailyTimeline.jsx src/components/DailyTimeline.css
git commit -m "feat: real time-based positioning in daily timeline with current-time indicator"
```

---

### Task 8: Show Time Badge on Day Column Task Cards

**Files:**
- Modify: `src/components/DayColumn.jsx`
- Modify: `src/components/DayColumn.css`

**Step 1: Add time badge to expanded task cards in DayColumn.jsx**

In the expanded task card's `.dc-task-title-row` (around where the estimate button is rendered), add a time badge before the estimate button:

```jsx
{task.startTime && (
  <span className="dc-time-badge">
    {formatTimeDisplay(task.startTime)}
    {task.endTime && ` - ${formatTimeDisplay(task.endTime)}`}
  </span>
)}
```

Add this helper function near the top of `DayColumn.jsx`:

```javascript
function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'p' : 'a';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}
```

**Step 2: Add time badge CSS**

Add to `DayColumn.css`:

```css
/* Time badge */
.dc-time-badge {
  font-size: 10px;
  font-weight: 600;
  color: #3B82F6;
  background: #EFF6FF;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  white-space: nowrap;
}
```

**Step 3: Verify in browser**

Run: `npm run dev`
Expected: Tasks with start/end times show a blue time badge like "9a - 10:30a" in the expanded day column.

**Step 4: Commit**

```bash
git add src/components/DayColumn.jsx src/components/DayColumn.css
git commit -m "feat: show time badge on task cards in day columns"
```

---

### Task 9: Create Desktop Launch Script (Enhancement 1)

**Files:**
- Create: `start-dayframe.bat`

**Step 1: Create the batch file**

Create `start-dayframe.bat` at the project root:

```bat
@echo off
title DayFrame Launcher

:: Check if server is already running on port 3001
netstat -ano | findstr ":3001" >nul 2>&1
if %errorlevel%==0 (
    echo Server already running on port 3001.
) else (
    echo Starting DayFrame server...
    cd /d "%~dp0"
    start /min cmd /c "npm start"
    echo Waiting for server to start...
    timeout /t 4 /nobreak >nul
)

echo Opening DayFrame in browser...
start "" "http://localhost:3001"
```

**Step 2: Verify the script works**

1. First build the production frontend: `npm run build`
2. Double-click `start-dayframe.bat` (or run from terminal)
Expected: Server starts (if not already running), browser opens to DayFrame.

**Step 3: Commit**

```bash
git add start-dayframe.bat
git commit -m "feat: add desktop launch script for one-click DayFrame startup"
```

---

### Task 10: Final Integration Test and Cleanup

**Step 1: Run linter**

```bash
npm run lint
```

Fix any lint errors.

**Step 2: Run tests**

```bash
npm run test:run
```

Fix any test failures.

**Step 3: Full manual verification**

Run: `npm run dev`

Verify:
1. Mini day columns show compact truncated task titles (no vertical text)
2. Tasks can be dragged between day columns to reschedule
3. Tasks can be reordered within a day column by dragging
4. Backlog drag-to-day still works
5. TaskModal shows start/end time pickers
6. Timeline shows tasks at correct time positions
7. Current time red line appears on today's timeline
8. Time badges appear on task cards with set times

**Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: address lint/test issues from planner enhancements"
```
