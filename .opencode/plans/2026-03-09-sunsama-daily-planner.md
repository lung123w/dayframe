# Sunsama-Style Daily Planner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Calendar + Outstanding views with a Sunsama-inspired daily planner featuring a 3-panel layout (backlog sidebar, daily task columns with weekly objectives, and a vertical timeline), plus time boxing, daily shutdown/review, and drag-and-drop task scheduling.

**Architecture:** The new Planner view replaces both `calendar` and `outstanding` as the default `activeView` in App.jsx. It uses a 3-panel flexbox layout: always-visible left backlog sidebar, center panel with today's expanded task list + mini-week row + daily shutdown section, and right vertical timeline. Two new database tables (`weekly_objectives` and `daily_notes`) store weekly goals and shutdown notes. The `tasks` table gains an `estimatedMinutes` column for time boxing. All existing task CRUD, project filtering, and recurring task logic is preserved and reused.

**Tech Stack:** React 19, date-fns 4.1, Express 5, better-sqlite3, existing CSS design system (Slate palette, Plus Jakarta Sans, orange CTA).

---

## Overview of New Components

| Component | File | Purpose |
|-----------|------|---------|
| `DailyPlanner` | `src/components/DailyPlanner.jsx` | Top-level 3-panel layout orchestrator |
| `BacklogSidebar` | `src/components/BacklogSidebar.jsx` | Left panel: unscheduled tasks, grouped by project, draggable |
| `DayColumn` | `src/components/DayColumn.jsx` | Single day's task list with time boxing, status cycling, inline time estimate |
| `MiniWeekBar` | `src/components/MiniWeekBar.jsx` | Horizontal Mon-Sun mini-week navigation |
| `WeeklyObjectives` | `src/components/WeeklyObjectives.jsx` | Simple text goals for the current week |
| `DailyTimeline` | `src/components/DailyTimeline.jsx` | Right panel: vertical timeline showing today's tasks on a time axis |
| `DailyShutdown` | `src/components/DailyShutdown.jsx` | Inline section: rollover tasks, highlights, time summary |

## Overview of Backend Changes

| Change | File | Detail |
|--------|------|--------|
| Add `estimatedMinutes` column to `tasks` | `server/db.js` | `ALTER TABLE tasks ADD COLUMN estimatedMinutes INTEGER DEFAULT NULL` |
| New `weekly_objectives` table | `server/db.js` | `id, weekStart (TEXT, YYYY-MM-DD), objectives (TEXT JSON array), createdAt, updatedAt` |
| New `daily_notes` table | `server/db.js` | `id, date (TEXT, YYYY-MM-DD, UNIQUE), highlights (TEXT), rolledOverTaskIds (TEXT JSON), createdAt, updatedAt` |
| New route: `/api/weekly-objectives` | `server/routes/weeklyObjectives.js` | CRUD for weekly goals |
| New route: `/api/daily-notes` | `server/routes/dailyNotes.js` | CRUD for daily shutdown notes |
| Update tasks route | `server/routes/tasks.js` | Include `estimatedMinutes` in create/update |
| New API services | `src/api.js` | `weeklyObjectiveService`, `dailyNoteService` |

---

## Task 1: Database Schema — Add `estimatedMinutes` to Tasks

**Files:**
- Modify: `server/db.js:14-81` (add ALTER TABLE after CREATE TABLE block)
- Modify: `server/routes/tasks.js:34-61` (POST — include estimatedMinutes)
- Modify: `server/routes/tasks.js:64-96` (PUT — include estimatedMinutes)

**Step 1: Add the column migration to `server/db.js`**

After the closing `);` of the `db.exec(...)` block (after line 81), add:

```javascript
// Migrations — add columns safely
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN estimatedMinutes INTEGER DEFAULT NULL`);
} catch (e) {
  // Column already exists — ignore
}
```

**Step 2: Update `parseTask()` in `server/routes/tasks.js`**

In the `parseTask(row)` function (lines 7-18), ensure `estimatedMinutes` passes through. It's a simple integer so no JSON parsing needed — it flows through naturally. No change needed to `parseTask`.

**Step 3: Update POST handler in `server/routes/tasks.js`**

In the POST endpoint (line 34-61), add `estimatedMinutes` to the INSERT statement and bind params. The current INSERT has these columns — add `estimatedMinutes` after `statusFromOverrides`:

Find the `db.prepare(...)` INSERT statement and add `, estimatedMinutes` to both the column list and VALUES placeholders. Add `estimatedMinutes: req.body.estimatedMinutes ?? null` to the `.run()` params.

**Step 4: Update PUT handler in `server/routes/tasks.js`**

In the PUT endpoint (line 64-96), add `estimatedMinutes` to the merged object. The PUT handler merges `req.body` onto the existing task, so add:

```javascript
estimatedMinutes: req.body.estimatedMinutes !== undefined ? req.body.estimatedMinutes : existing.estimatedMinutes,
```

**Step 5: Restart dev server and verify**

```bash
# The server auto-restarts with --watch
# Test via curl:
curl -s http://localhost:3001/api/tasks | head -c 200
# Verify tasks load without error
```

**Step 6: Commit**

```bash
git add server/db.js server/routes/tasks.js
git commit -m "feat: add estimatedMinutes column to tasks table"
```

---

## Task 2: Database Schema — Weekly Objectives Table + Route

**Files:**
- Modify: `server/db.js` (add CREATE TABLE)
- Create: `server/routes/weeklyObjectives.js`
- Modify: `server/index.js` (register route)
- Modify: `src/api.js` (add service)

**Step 1: Add `weekly_objectives` table to `server/db.js`**

Add inside the `db.exec(...)` template literal, after the `habit_entries` table:

```sql
CREATE TABLE IF NOT EXISTS weekly_objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekStart TEXT NOT NULL,
  objectives TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(weekStart)
);
```

`weekStart` is the Monday of the week in `YYYY-MM-DD` format. `objectives` is a JSON array of strings like `["Ship feature X", "Review PRs"]`.

**Step 2: Create `server/routes/weeklyObjectives.js`**

```javascript
import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET / — get objectives for a specific week (query: ?weekStart=YYYY-MM-DD)
router.get('/', (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart) {
    const rows = db.prepare('SELECT * FROM weekly_objectives ORDER BY weekStart DESC LIMIT 12').all();
    return res.json(rows.map(r => ({ ...r, objectives: JSON.parse(r.objectives) })));
  }
  const row = db.prepare('SELECT * FROM weekly_objectives WHERE weekStart = ?').get(weekStart);
  if (!row) return res.json({ weekStart, objectives: [] });
  res.json({ ...row, objectives: JSON.parse(row.objectives) });
});

// PUT / — upsert objectives for a week
router.put('/', (req, res) => {
  const { weekStart, objectives } = req.body;
  if (!weekStart || !Array.isArray(objectives)) {
    return res.status(400).json({ error: 'weekStart (string) and objectives (array) required' });
  }
  const existing = db.prepare('SELECT id FROM weekly_objectives WHERE weekStart = ?').get(weekStart);
  if (existing) {
    db.prepare('UPDATE weekly_objectives SET objectives = ?, updatedAt = datetime(\'now\') WHERE id = ?')
      .run(JSON.stringify(objectives), existing.id);
    const updated = db.prepare('SELECT * FROM weekly_objectives WHERE id = ?').get(existing.id);
    res.json({ ...updated, objectives: JSON.parse(updated.objectives) });
  } else {
    const result = db.prepare('INSERT INTO weekly_objectives (weekStart, objectives) VALUES (?, ?)')
      .run(weekStart, JSON.stringify(objectives));
    const created = db.prepare('SELECT * FROM weekly_objectives WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...created, objectives: JSON.parse(created.objectives) });
  }
});

export default router;
```

**Step 3: Register route in `server/index.js`**

Add after the habit-entries route:

```javascript
import weeklyObjectivesRouter from './routes/weeklyObjectives.js';
// ...
app.use('/api/weekly-objectives', weeklyObjectivesRouter);
```

**Step 4: Add API service in `src/api.js`**

Add at the end of the file:

```javascript
export const weeklyObjectiveService = {
  getByWeek: (weekStart) => request(`/api/weekly-objectives?weekStart=${weekStart}`),
  upsert: (weekStart, objectives) => request('/api/weekly-objectives', {
    method: 'PUT',
    body: JSON.stringify({ weekStart, objectives }),
  }),
};
```

**Step 5: Verify**

```bash
curl -s http://localhost:3001/api/weekly-objectives
# Should return [] (empty)
curl -X PUT http://localhost:3001/api/weekly-objectives \
  -H "Content-Type: application/json" \
  -d '{"weekStart":"2026-03-09","objectives":["Test goal"]}'
# Should return created object
```

**Step 6: Commit**

```bash
git add server/db.js server/routes/weeklyObjectives.js server/index.js src/api.js
git commit -m "feat: add weekly_objectives table, route, and API service"
```

---

## Task 3: Database Schema — Daily Notes Table + Route

**Files:**
- Modify: `server/db.js` (add CREATE TABLE)
- Create: `server/routes/dailyNotes.js`
- Modify: `server/index.js` (register route)
- Modify: `src/api.js` (add service)

**Step 1: Add `daily_notes` table to `server/db.js`**

Add inside the `db.exec(...)` template literal:

```sql
CREATE TABLE IF NOT EXISTS daily_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  highlights TEXT NOT NULL DEFAULT '',
  rolledOverTaskIds TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(date)
);
```

`date` is `YYYY-MM-DD`. `highlights` is free text. `rolledOverTaskIds` is a JSON array of task IDs that were rolled over from this day.

**Step 2: Create `server/routes/dailyNotes.js`**

```javascript
import { Router } from 'express';
import db from '../db.js';

const router = Router();

function parseNote(row) {
  if (!row) return null;
  return { ...row, rolledOverTaskIds: JSON.parse(row.rolledOverTaskIds || '[]') };
}

// GET / — get note for a date (query: ?date=YYYY-MM-DD)
router.get('/', (req, res) => {
  const { date } = req.query;
  if (!date) {
    const rows = db.prepare('SELECT * FROM daily_notes ORDER BY date DESC LIMIT 30').all();
    return res.json(rows.map(parseNote));
  }
  const row = db.prepare('SELECT * FROM daily_notes WHERE date = ?').get(date);
  if (!row) return res.json({ date, highlights: '', rolledOverTaskIds: [] });
  res.json(parseNote(row));
});

// PUT / — upsert note for a date
router.put('/', (req, res) => {
  const { date, highlights, rolledOverTaskIds } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  const existing = db.prepare('SELECT id FROM daily_notes WHERE date = ?').get(date);
  const hl = highlights ?? '';
  const rolled = JSON.stringify(rolledOverTaskIds ?? []);
  if (existing) {
    db.prepare('UPDATE daily_notes SET highlights = ?, rolledOverTaskIds = ?, updatedAt = datetime(\'now\') WHERE id = ?')
      .run(hl, rolled, existing.id);
    const updated = db.prepare('SELECT * FROM daily_notes WHERE id = ?').get(existing.id);
    res.json(parseNote(updated));
  } else {
    const result = db.prepare('INSERT INTO daily_notes (date, highlights, rolledOverTaskIds) VALUES (?, ?, ?)')
      .run(date, hl, rolled);
    const created = db.prepare('SELECT * FROM daily_notes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseNote(created));
  }
});

export default router;
```

**Step 3: Register route in `server/index.js`**

```javascript
import dailyNotesRouter from './routes/dailyNotes.js';
// ...
app.use('/api/daily-notes', dailyNotesRouter);
```

**Step 4: Add API service in `src/api.js`**

```javascript
export const dailyNoteService = {
  getByDate: (date) => request(`/api/daily-notes?date=${date}`),
  upsert: (data) => request('/api/daily-notes', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};
```

**Step 5: Verify**

```bash
curl -s http://localhost:3001/api/daily-notes
# Should return []
curl -X PUT http://localhost:3001/api/daily-notes \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-09","highlights":"Great day","rolledOverTaskIds":[]}'
# Should return created
```

**Step 6: Commit**

```bash
git add server/db.js server/routes/dailyNotes.js server/index.js src/api.js
git commit -m "feat: add daily_notes table, route, and API service"
```

---

## Task 4: Update TaskModal — Add `estimatedMinutes` to form

**Files:**
- Modify: `src/components/TaskModal.jsx:9-26` (add to formData)
- Modify: `src/components/TaskModal.jsx:271-294` (include in handleSubmit)

**Step 1: Add `estimatedMinutes` to initial form state**

In the `formData` state (line 9-26), add `estimatedMinutes: ''` as a new field.

**Step 2: Populate from existing task in useEffect**

In the `useEffect` that populates form data when editing (look for the block that sets formData from `task` prop), add:

```javascript
estimatedMinutes: task.estimatedMinutes ?? '',
```

**Step 3: Add form field — place AFTER the Due Date field (line ~471)**

```jsx
{/* Estimated Time */}
<div className="form-group">
  <label>Estimated Time (minutes)</label>
  <input
    type="number"
    min="0"
    step="5"
    placeholder="e.g. 30"
    value={formData.estimatedMinutes}
    onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
    className="form-input"
  />
</div>
```

**Step 4: Include in handleSubmit**

In `handleSubmit` (line 271-294), add to the `taskData` object:

```javascript
estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes, 10) : null,
```

**Step 5: Test manually**

Open the task modal in browser, verify the "Estimated Time" field appears and saves correctly.

**Step 6: Commit**

```bash
git add src/components/TaskModal.jsx
git commit -m "feat: add estimatedMinutes field to task modal"
```

---

## Task 5: DayColumn Component — Reusable Daily Task List

This is the core component that renders a single day's tasks. It reuses patterns from DayPanel.jsx but adds inline time estimates and time boxing totals.

**Files:**
- Create: `src/components/DayColumn.jsx`
- Create: `src/components/DayColumn.css`

**Step 1: Create `src/components/DayColumn.jsx`**

```jsx
import React, { useMemo } from 'react';
import { FaPlus, FaCircle, FaCheckCircle, FaSpinner, FaTrash, FaEdit, FaClock } from 'react-icons/fa';
import { generateRecurringTasks } from '../utils/recurrence';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import './DayColumn.css';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_CYCLE = { todo: 'in-progress', 'in-progress': 'completed', completed: 'todo' };
const STATUS_ICON = {
  'todo':        <FaCircle className="dc-status-icon dc-status-icon--todo" />,
  'in-progress': <FaSpinner className="dc-status-icon dc-status-icon--progress" />,
  'completed':   <FaCheckCircle className="dc-status-icon dc-status-icon--done" />,
};

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function formatDayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE'); // "Monday", "Tuesday", etc.
}

function formatDayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'MMM d');
}

function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function DayColumn({
  dateStr,
  tasks,
  projects,
  teamMembers,
  subtasks,
  expanded = false,
  onTaskClick,
  onStatusUpdate,
  onNewTask,
  onDeleteTask,
  onSubtaskToggle,
  onEstimateChange,
  onDragOver,
  onDrop,
}) {
  // Get tasks for this day
  const dayTasks = useMemo(() => {
    if (!dateStr) return [];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d);
    const dayEnd = new Date(y, m - 1, d + 1);

    const result = [];
    for (const task of tasks) {
      if (task.isRecurring && task.dueDate) {
        const instances = generateRecurringTasks(task, dayStart, dayEnd);
        result.push(...instances);
      } else if (task.dueDate && toLocalDateStr(task.dueDate) === dateStr) {
        result.push(task);
      }
    }
    return result.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
  }, [tasks, dateStr]);

  // Subtask map
  const subtasksByTaskId = useMemo(() => {
    const map = {};
    (subtasks || []).forEach(st => {
      if (!map[st.parentTaskId]) map[st.parentTaskId] = [];
      map[st.parentTaskId].push(st);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    return map;
  }, [subtasks]);

  const getProject = id => projects.find(p => p.id === id);
  const getAssigneeNames = assignedTo => {
    const ids = Array.isArray(assignedTo) ? assignedTo : (assignedTo != null ? [assignedTo] : []);
    return ids.map(id => teamMembers.find(m => m.id === id)?.name).filter(Boolean).join(', ');
  };

  // Time boxing totals
  const totalEstimated = dayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const todoTasks = dayTasks.filter(t => t.status !== 'completed');
  const doneTasks = dayTasks.filter(t => t.status === 'completed');

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const isTodayDate = isToday(dateObj);

  // Inline time estimate editor state
  const [editingEstimate, setEditingEstimate] = React.useState(null);
  const [estimateValue, setEstimateValue] = React.useState('');

  const handleEstimateSave = (task) => {
    const minutes = estimateValue ? parseInt(estimateValue, 10) : null;
    if (onEstimateChange) {
      onEstimateChange(task, minutes);
    }
    setEditingEstimate(null);
  };

  const renderTask = (task) => {
    const project = getProject(task.projectId);
    const assignees = getAssigneeNames(task.assignedTo);
    const isCompleted = task.status === 'completed';
    const subtaskTaskId = task.isRecurringInstance ? (task.recurringSourceId || task.id) : task.id;
    const taskSubtasks = subtasksByTaskId[subtaskTaskId] || [];
    const completedSubtasks = taskSubtasks.filter(st => st.completed).length;
    const taskKey = task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id;
    const isEditingEst = editingEstimate === taskKey;

    return (
      <div
        key={taskKey}
        className={`dc-task${isCompleted ? ' dc-task--done' : ''}`}
        style={{ borderLeftColor: project?.color || '#E2E8F0' }}
      >
        <button
          className="dc-status-btn"
          title={`Cycle status`}
          onClick={() => onStatusUpdate(task, STATUS_CYCLE[task.status], task.isRecurringInstance ? 'single' : undefined)}
        >
          {STATUS_ICON[task.status]}
        </button>

        <div className="dc-task-content">
          <div className="dc-task-title-row">
            <span className={`dc-task-title${isCompleted ? ' dc-task-title--done' : ''}`}>
              {task.title}
            </span>
            {/* Inline time estimate */}
            {isEditingEst ? (
              <span className="dc-estimate-edit" onClick={e => e.stopPropagation()}>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="dc-estimate-input"
                  value={estimateValue}
                  onChange={e => setEstimateValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEstimateSave(task); if (e.key === 'Escape') setEditingEstimate(null); }}
                  autoFocus
                  placeholder="min"
                />
                <button className="dc-estimate-save" onClick={() => handleEstimateSave(task)}>OK</button>
              </span>
            ) : (
              <button
                className="dc-estimate-btn"
                title="Set time estimate"
                onClick={() => { setEditingEstimate(taskKey); setEstimateValue(task.estimatedMinutes ?? ''); }}
              >
                <FaClock />
                {task.estimatedMinutes ? <span className="dc-estimate-label">{formatMinutes(task.estimatedMinutes)}</span> : null}
              </button>
            )}
          </div>

          {/* Subtask progress */}
          {expanded && taskSubtasks.length > 0 && (
            <div className="dc-subtask-section" onClick={e => e.stopPropagation()}>
              <span className="dc-subtask-summary">[{completedSubtasks}/{taskSubtasks.length}]</span>
              <ul className="dc-subtask-list">
                {taskSubtasks.map(st => (
                  <li key={st.id} className={`dc-subtask-item${st.completed ? ' dc-subtask-item--done' : ''}`}>
                    <input
                      type="checkbox"
                      className="dc-subtask-checkbox"
                      checked={st.completed}
                      onChange={() => onSubtaskToggle(st.id)}
                    />
                    <span className="dc-subtask-title">{st.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta: project + priority + assignee */}
          <div className="dc-task-meta">
            {project && (
              <span className="dc-meta-chip" style={{ color: project.color, borderColor: project.color + '50' }}>
                <span className="dc-meta-dot" style={{ background: project.color }} />
                {project.name}
              </span>
            )}
            {assignees && <span className="dc-meta-chip dc-meta-chip--assignee">{assignees}</span>}
          </div>
        </div>

        {/* Actions — only in expanded mode */}
        {expanded && (
          <div className="dc-task-actions">
            <button className="dc-action-btn" title="Edit" onClick={() => onTaskClick(task)}><FaEdit /></button>
            {onDeleteTask && <button className="dc-action-btn dc-action-btn--delete" title="Delete" onClick={() => onDeleteTask(task.id)}><FaTrash /></button>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`dc-column${expanded ? ' dc-column--expanded' : ''}${isTodayDate ? ' dc-column--today' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-date={dateStr}
    >
      {/* Column header */}
      <div className="dc-header">
        <div className="dc-header-label">
          <span className={`dc-day-name${isTodayDate ? ' dc-day-name--today' : ''}`}>{formatDayLabel(dateStr)}</span>
          <span className="dc-day-date">{formatDayDate(dateStr)}</span>
        </div>
        <div className="dc-header-stats">
          {totalEstimated > 0 && (
            <span className="dc-time-total" title="Total estimated time">
              <FaClock /> {formatMinutes(totalEstimated)}
            </span>
          )}
          <span className="dc-task-count">{dayTasks.length}</span>
        </div>
      </div>

      {/* Task list */}
      <div className="dc-body">
        {todoTasks.length === 0 && doneTasks.length === 0 ? (
          <div className="dc-empty">
            {expanded ? (
              <>
                <span>No tasks</span>
                <button className="dc-add-btn" onClick={() => onNewTask(dateStr)}>
                  <FaPlus /> Add task
                </button>
              </>
            ) : (
              <span className="dc-empty-mini">--</span>
            )}
          </div>
        ) : (
          <>
            {todoTasks.map(renderTask)}
            {doneTasks.length > 0 && expanded && (
              <div className="dc-done-section">
                <div className="dc-done-divider">
                  <span>Completed ({doneTasks.length})</span>
                </div>
                {doneTasks.map(renderTask)}
              </div>
            )}
            {!expanded && doneTasks.length > 0 && (
              <div className="dc-done-count">{doneTasks.length} done</div>
            )}
          </>
        )}
      </div>

      {/* Add task button for expanded */}
      {expanded && dayTasks.length > 0 && (
        <button className="dc-footer-add" onClick={() => onNewTask(dateStr)}>
          <FaPlus /> Add task
        </button>
      )}
    </div>
  );
}
```

**Step 2: Create `src/components/DayColumn.css`**

```css
/* ── Day Column ── */
.dc-column {
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  transition: box-shadow 0.15s ease;
}

.dc-column--expanded {
  min-width: 340px;
  flex: 2;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.dc-column--today {
  border-color: #F97316;
  border-width: 2px;
}

/* Header */
.dc-header {
  padding: 12px 16px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #F1F5F9;
}

.dc-header-label { display: flex; flex-direction: column; gap: 2px; }
.dc-day-name { font-size: 14px; font-weight: 700; color: #1E293B; }
.dc-day-name--today { color: #F97316; }
.dc-day-date { font-size: 11px; color: #94A3B8; font-weight: 500; }

.dc-header-stats { display: flex; align-items: center; gap: 8px; }
.dc-time-total {
  font-size: 11px; color: #64748B; display: flex; align-items: center; gap: 4px;
  background: #F1F5F9; padding: 2px 8px; border-radius: 12px; font-weight: 600;
}
.dc-task-count {
  font-size: 11px; background: #E2E8F0; color: #475569;
  border-radius: 50%; width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center; font-weight: 700;
}

/* Body */
.dc-body { padding: 8px; flex: 1; overflow-y: auto; max-height: calc(100vh - 300px); }

/* Task card */
.dc-task {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px; border-radius: 6px;
  border-left: 3px solid #E2E8F0;
  margin-bottom: 4px;
  transition: background 0.12s ease;
  cursor: default;
}
.dc-task:hover { background: #F8FAFC; }
.dc-task--done { opacity: 0.6; }

/* Status button */
.dc-status-btn {
  background: none; border: none; cursor: pointer; padding: 2px;
  flex-shrink: 0; margin-top: 2px;
}
.dc-status-icon { font-size: 14px; }
.dc-status-icon--todo { color: #CBD5E1; }
.dc-status-icon--progress { color: #3B82F6; }
.dc-status-icon--done { color: #16A34A; }

/* Task content */
.dc-task-content { flex: 1; min-width: 0; }
.dc-task-title-row { display: flex; align-items: center; gap: 6px; }
.dc-task-title { font-size: 13px; font-weight: 600; color: #1E293B; flex: 1; word-break: break-word; }
.dc-task-title--done { text-decoration: line-through; color: #94A3B8; }

/* Inline time estimate */
.dc-estimate-btn {
  background: none; border: 1px solid transparent; cursor: pointer;
  font-size: 11px; color: #94A3B8; display: flex; align-items: center; gap: 3px;
  padding: 1px 6px; border-radius: 4px; flex-shrink: 0;
  transition: border-color 0.12s, color 0.12s;
}
.dc-estimate-btn:hover { border-color: #E2E8F0; color: #64748B; }
.dc-estimate-label { font-weight: 600; color: #64748B; }

.dc-estimate-edit { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.dc-estimate-input {
  width: 56px; padding: 2px 6px; border: 1.5px solid #3B82F6; border-radius: 4px;
  font-size: 12px; font-family: inherit; outline: none;
}
.dc-estimate-save {
  background: #3B82F6; color: white; border: none; border-radius: 4px;
  padding: 2px 8px; font-size: 11px; cursor: pointer; font-weight: 600;
}

/* Meta */
.dc-task-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.dc-meta-chip {
  font-size: 10px; font-weight: 600; padding: 1px 6px;
  border: 1px solid; border-radius: 3px;
  display: inline-flex; align-items: center; gap: 3px;
}
.dc-meta-dot { width: 6px; height: 6px; border-radius: 50%; }
.dc-meta-chip--assignee { color: #64748B; border-color: #E2E8F0; }

/* Subtasks */
.dc-subtask-section { margin-top: 4px; }
.dc-subtask-summary { font-size: 10px; color: #94A3B8; font-weight: 600; }
.dc-subtask-list { list-style: none; padding: 0; margin: 2px 0 0; }
.dc-subtask-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #475569; padding: 1px 0; }
.dc-subtask-item--done { color: #94A3B8; text-decoration: line-through; }
.dc-subtask-checkbox { margin: 0; cursor: pointer; }
.dc-subtask-title { flex: 1; }

/* Actions */
.dc-task-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
.dc-action-btn {
  background: none; border: none; cursor: pointer; color: #94A3B8;
  font-size: 12px; padding: 4px; border-radius: 4px;
  transition: color 0.12s, background 0.12s;
}
.dc-action-btn:hover { color: #475569; background: #F1F5F9; }
.dc-action-btn--delete:hover { color: #DC2626; background: #FEF2F2; }

/* Empty state */
.dc-empty { padding: 16px; text-align: center; color: #94A3B8; font-size: 13px; }
.dc-empty-mini { font-size: 11px; }
.dc-add-btn {
  background: none; border: 1.5px dashed #E2E8F0; color: #94A3B8;
  padding: 6px 12px; border-radius: 6px; cursor: pointer;
  font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;
  margin-top: 8px; transition: border-color 0.12s, color 0.12s;
}
.dc-add-btn:hover { border-color: #94A3B8; color: #64748B; }

/* Done section */
.dc-done-section { margin-top: 8px; }
.dc-done-divider {
  display: flex; align-items: center; gap: 8px; padding: 4px 0;
  font-size: 11px; color: #94A3B8; font-weight: 600;
}
.dc-done-divider::after { content: ''; flex: 1; height: 1px; background: #E2E8F0; }
.dc-done-count { font-size: 11px; color: #94A3B8; text-align: center; padding: 4px; }

/* Footer add button */
.dc-footer-add {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px; border-top: 1px solid #F1F5F9;
  background: none; border-left: none; border-right: none; border-bottom: none;
  color: #94A3B8; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: background 0.12s, color 0.12s; border-radius: 0 0 10px 10px;
}
.dc-footer-add:hover { background: #F8FAFC; color: #64748B; }
```

**Step 3: Commit**

```bash
git add src/components/DayColumn.jsx src/components/DayColumn.css
git commit -m "feat: create DayColumn component with inline time estimates"
```

---

## Task 6: BacklogSidebar Component

**Files:**
- Create: `src/components/BacklogSidebar.jsx`
- Create: `src/components/BacklogSidebar.css`

**Step 1: Create `src/components/BacklogSidebar.jsx`**

```jsx
import React, { useState, useMemo } from 'react';
import { FaInbox, FaTimes, FaGripVertical } from 'react-icons/fa';
import './BacklogSidebar.css';

export default function BacklogSidebar({ tasks, projects, onTaskClick, onAssignDate, onDeleteTask }) {
  const [filterProject, setFilterProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const unscheduledTasks = useMemo(() => {
    let result = tasks.filter(t => !t.dueDate);
    if (filterProject) result = result.filter(t => String(t.projectId) === filterProject);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, filterProject, searchQuery]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map();
    for (const task of unscheduledTasks) {
      const pId = task.projectId || 0;
      if (!map.has(pId)) map.set(pId, []);
      map.get(pId).push(task);
    }
    return map;
  }, [unscheduledTasks]);

  const getProject = id => projects.find(p => p.id === id);

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="backlog-sidebar">
      {/* Header */}
      <div className="backlog-header">
        <div className="backlog-title-row">
          <FaInbox className="backlog-icon" />
          <span className="backlog-title">Backlog</span>
          <span className="backlog-count">{unscheduledTasks.length}</span>
        </div>
        <p className="backlog-subtitle">Drag tasks to a day</p>
      </div>

      {/* Search + Filter */}
      <div className="backlog-controls">
        <input
          type="text"
          className="backlog-search"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          className="backlog-filter"
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        {(filterProject || searchQuery) && (
          <button className="backlog-clear" onClick={() => { setFilterProject(''); setSearchQuery(''); }}>
            <FaTimes />
          </button>
        )}
      </div>

      {/* Task list grouped by project */}
      <div className="backlog-body">
        {unscheduledTasks.length === 0 ? (
          <div className="backlog-empty">
            {tasks.filter(t => !t.dueDate).length === 0
              ? 'All tasks scheduled!'
              : 'No tasks match filters'}
          </div>
        ) : (
          [...grouped.entries()].map(([projectId, groupTasks]) => {
            const project = getProject(projectId);
            return (
              <div key={projectId} className="backlog-group">
                <div className="backlog-group-header" style={{ borderLeftColor: project?.color || '#94A3B8' }}>
                  <span className="backlog-group-name">{project?.name || 'No Project'}</span>
                  <span className="backlog-group-count">{groupTasks.length}</span>
                </div>
                {groupTasks.map(task => (
                  <div
                    key={task.id}
                    className="backlog-task"
                    draggable
                    onDragStart={e => handleDragStart(e, task)}
                  >
                    <FaGripVertical className="backlog-grip" />
                    <span className="backlog-task-title" onClick={() => onTaskClick(task)}>
                      {task.title}
                    </span>
                    <span className={`backlog-priority backlog-priority--${task.priority}`} />
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create `src/components/BacklogSidebar.css`**

```css
/* ── Backlog Sidebar ── */
.backlog-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 84px;
  max-height: calc(100vh - 100px);
  overflow: hidden;
}

/* Header */
.backlog-header { padding: 14px 16px 8px; }
.backlog-title-row { display: flex; align-items: center; gap: 8px; }
.backlog-icon { color: #F97316; font-size: 16px; }
.backlog-title { font-size: 15px; font-weight: 700; color: #1E293B; }
.backlog-count {
  font-size: 11px; background: #F97316; color: white;
  border-radius: 20px; padding: 1px 7px; font-weight: 700;
}
.backlog-subtitle { font-size: 11px; color: #94A3B8; margin: 4px 0 0; }

/* Controls */
.backlog-controls {
  padding: 0 12px 8px; display: flex; gap: 6px; align-items: center;
}
.backlog-search {
  flex: 1; padding: 5px 8px; border: 1.5px solid #E2E8F0; border-radius: 5px;
  font-size: 12px; font-family: inherit; outline: none;
  transition: border-color 0.12s;
}
.backlog-search:focus { border-color: #94A3B8; }
.backlog-filter {
  padding: 5px 6px; border: 1.5px solid #E2E8F0; border-radius: 5px;
  font-size: 11px; font-family: inherit; background: white; cursor: pointer;
  max-width: 100px;
}
.backlog-clear {
  background: none; border: none; cursor: pointer; color: #94A3B8;
  font-size: 12px; padding: 4px;
}
.backlog-clear:hover { color: #64748B; }

/* Body */
.backlog-body { flex: 1; overflow-y: auto; padding: 0 8px 8px; }

/* Empty */
.backlog-empty {
  text-align: center; color: #94A3B8; font-size: 12px; padding: 24px 8px;
}

/* Group */
.backlog-group { margin-bottom: 8px; }
.backlog-group-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 8px; font-size: 11px; font-weight: 700; color: #64748B;
  text-transform: uppercase; letter-spacing: 0.5px;
  border-left: 3px solid; margin-bottom: 2px;
}
.backlog-group-count {
  font-size: 10px; background: #F1F5F9; color: #64748B;
  border-radius: 10px; padding: 0 6px; font-weight: 600;
}

/* Task item */
.backlog-task {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; border-radius: 5px; cursor: grab;
  transition: background 0.12s;
}
.backlog-task:hover { background: #F8FAFC; }
.backlog-task:active { cursor: grabbing; }

.backlog-grip { color: #CBD5E1; font-size: 10px; flex-shrink: 0; }
.backlog-task-title {
  flex: 1; font-size: 13px; color: #1E293B; font-weight: 500;
  cursor: pointer; word-break: break-word;
}
.backlog-task-title:hover { color: #3B82F6; }

.backlog-priority {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.backlog-priority--high { background: #DC2626; }
.backlog-priority--medium { background: #F59E0B; }
.backlog-priority--low { background: #10B981; }
```

**Step 3: Commit**

```bash
git add src/components/BacklogSidebar.jsx src/components/BacklogSidebar.css
git commit -m "feat: create BacklogSidebar component with drag support"
```

---

## Task 7: MiniWeekBar Component

**Files:**
- Create: `src/components/MiniWeekBar.jsx`
- Create: `src/components/MiniWeekBar.css`

**Step 1: Create `src/components/MiniWeekBar.jsx`**

```jsx
import React, { useMemo } from 'react';
import { startOfWeek, addDays, format, isToday, isSameDay } from 'date-fns';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './MiniWeekBar.css';

export default function MiniWeekBar({ selectedDate, onSelectDate, onPrevWeek, onNextWeek, tasks }) {
  // selectedDate is YYYY-MM-DD string
  const [y, m, d] = selectedDate.split('-').map(Number);
  const selected = new Date(y, m - 1, d);
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 }); // Monday

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const taskCount = tasks.filter(t => {
        if (!t.dueDate) return false;
        const td = typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : format(new Date(t.dueDate), 'yyyy-MM-dd');
        return td === dateStr;
      }).length;
      return {
        date,
        dateStr,
        dayName: format(date, 'EEE'),
        dayNum: format(date, 'd'),
        isToday: isToday(date),
        isSelected: isSameDay(date, selected),
        taskCount,
      };
    });
  }, [weekStart, selected, tasks]);

  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;

  return (
    <div className="mini-week">
      <div className="mini-week-nav">
        <button className="mini-week-arrow" onClick={onPrevWeek}><FaChevronLeft /></button>
        <span className="mini-week-label">{weekLabel}</span>
        <button className="mini-week-arrow" onClick={onNextWeek}><FaChevronRight /></button>
      </div>
      <div className="mini-week-days">
        {days.map(day => (
          <button
            key={day.dateStr}
            className={`mini-week-day${day.isToday ? ' mini-week-day--today' : ''}${day.isSelected ? ' mini-week-day--selected' : ''}`}
            onClick={() => onSelectDate(day.dateStr)}
          >
            <span className="mini-week-day-name">{day.dayName}</span>
            <span className="mini-week-day-num">{day.dayNum}</span>
            {day.taskCount > 0 && <span className="mini-week-day-dots">{day.taskCount}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create `src/components/MiniWeekBar.css`**

```css
/* ── Mini Week Bar ── */
.mini-week { margin-bottom: 16px; }
.mini-week-nav {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  margin-bottom: 8px;
}
.mini-week-arrow {
  background: none; border: 1.5px solid #E2E8F0; border-radius: 6px;
  padding: 4px 8px; cursor: pointer; color: #64748B; font-size: 12px;
  transition: background 0.12s, border-color 0.12s;
}
.mini-week-arrow:hover { background: #F1F5F9; border-color: #94A3B8; }
.mini-week-label { font-size: 13px; font-weight: 600; color: #1E293B; }

.mini-week-days {
  display: flex; gap: 4px;
}
.mini-week-day {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 8px 4px; border-radius: 8px; border: 1.5px solid transparent;
  cursor: pointer; background: white; transition: all 0.12s;
  font-family: inherit;
}
.mini-week-day:hover { background: #F8FAFC; border-color: #E2E8F0; }

.mini-week-day--selected {
  background: #FFF7ED; border-color: #F97316;
}
.mini-week-day--today .mini-week-day-num {
  background: #F97316; color: white; border-radius: 50%;
  width: 24px; height: 24px; display: flex; align-items: center;
  justify-content: center;
}

.mini-week-day-name { font-size: 10px; color: #94A3B8; font-weight: 700; text-transform: uppercase; }
.mini-week-day-num { font-size: 14px; font-weight: 700; color: #1E293B; margin: 2px 0; }
.mini-week-day-dots {
  font-size: 9px; background: #E2E8F0; color: #64748B;
  border-radius: 8px; padding: 0 5px; font-weight: 700;
}
```

**Step 3: Commit**

```bash
git add src/components/MiniWeekBar.jsx src/components/MiniWeekBar.css
git commit -m "feat: create MiniWeekBar week navigation component"
```

---

## Task 8: WeeklyObjectives Component

**Files:**
- Create: `src/components/WeeklyObjectives.jsx`
- Create: `src/components/WeeklyObjectives.css`

**Step 1: Create `src/components/WeeklyObjectives.jsx`**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FaBullseye, FaPlus, FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { startOfWeek, format } from 'date-fns';
import { weeklyObjectiveService } from '../api';
import './WeeklyObjectives.css';

export default function WeeklyObjectives({ selectedDate }) {
  const [objectives, setObjectives] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Compute Monday of current week
  const [y, m, d] = selectedDate.split('-').map(Number);
  const weekStart = format(startOfWeek(new Date(y, m - 1, d), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const loadObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const data = await weeklyObjectiveService.getByWeek(weekStart);
      setObjectives(data.objectives || []);
    } catch (e) {
      console.error('Failed to load weekly objectives:', e);
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const save = async (updated) => {
    setObjectives(updated);
    try {
      await weeklyObjectiveService.upsert(weekStart, updated);
    } catch (e) {
      console.error('Failed to save weekly objectives:', e);
    }
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    save([...objectives, newGoal.trim()]);
    setNewGoal('');
  };

  const removeGoal = (index) => {
    save(objectives.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addGoal();
  };

  return (
    <div className="wo-container">
      <button className="wo-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        <FaBullseye className="wo-icon" />
        <span className="wo-title">Weekly Goals</span>
        {objectives.length > 0 && <span className="wo-badge">{objectives.length}</span>}
      </button>

      {!collapsed && (
        <div className="wo-body">
          {loading ? (
            <div className="wo-loading">Loading...</div>
          ) : (
            <>
              {objectives.length === 0 && (
                <div className="wo-empty">No goals set for this week</div>
              )}
              <ul className="wo-list">
                {objectives.map((goal, i) => (
                  <li key={i} className="wo-item">
                    <span className="wo-bullet">-</span>
                    <span className="wo-text">{goal}</span>
                    <button className="wo-remove" onClick={() => removeGoal(i)} title="Remove">
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="wo-add-row">
                <input
                  type="text"
                  className="wo-input"
                  placeholder="Add a goal..."
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="wo-add-btn" onClick={addGoal} disabled={!newGoal.trim()}>
                  <FaPlus />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create `src/components/WeeklyObjectives.css`**

```css
/* ── Weekly Objectives ── */
.wo-container {
  background: white; border: 1.5px solid #E2E8F0; border-radius: 10px;
  margin-bottom: 12px; overflow: hidden;
}

.wo-toggle {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 14px; background: none; border: none; cursor: pointer;
  font-family: inherit; text-align: left;
  color: #64748B; font-size: 12px;
}
.wo-toggle:hover { background: #F8FAFC; }

.wo-icon { color: #F97316; font-size: 14px; }
.wo-title { font-size: 13px; font-weight: 700; color: #1E293B; flex: 1; }
.wo-badge {
  font-size: 10px; background: #FFF7ED; color: #F97316;
  border-radius: 10px; padding: 1px 6px; font-weight: 700;
}

.wo-body { padding: 0 14px 12px; }
.wo-loading { font-size: 12px; color: #94A3B8; padding: 8px 0; }
.wo-empty { font-size: 12px; color: #94A3B8; padding: 4px 0; font-style: italic; }

.wo-list { list-style: none; padding: 0; margin: 0 0 8px; }
.wo-item {
  display: flex; align-items: flex-start; gap: 6px; padding: 3px 0;
  font-size: 13px; color: #1E293B;
}
.wo-bullet { color: #F97316; font-weight: 700; flex-shrink: 0; }
.wo-text { flex: 1; }
.wo-remove {
  background: none; border: none; cursor: pointer; color: #CBD5E1;
  font-size: 10px; padding: 2px; flex-shrink: 0;
  transition: color 0.12s;
}
.wo-remove:hover { color: #DC2626; }

.wo-add-row { display: flex; gap: 6px; }
.wo-input {
  flex: 1; padding: 5px 8px; border: 1.5px solid #E2E8F0; border-radius: 5px;
  font-size: 12px; font-family: inherit; outline: none;
}
.wo-input:focus { border-color: #94A3B8; }
.wo-add-btn {
  background: #F97316; color: white; border: none; border-radius: 5px;
  padding: 5px 10px; cursor: pointer; font-size: 12px;
  transition: background 0.12s;
}
.wo-add-btn:disabled { background: #CBD5E1; cursor: default; }
.wo-add-btn:hover:not(:disabled) { background: #EA580C; }
```

**Step 3: Commit**

```bash
git add src/components/WeeklyObjectives.jsx src/components/WeeklyObjectives.css
git commit -m "feat: create WeeklyObjectives component"
```

---

## Task 9: DailyTimeline Component

**Files:**
- Create: `src/components/DailyTimeline.jsx`
- Create: `src/components/DailyTimeline.css`

**Step 1: Create `src/components/DailyTimeline.jsx`**

The timeline shows tasks for the selected day plotted on a vertical time axis from 8am-8pm. Tasks with `estimatedMinutes` show as time blocks; tasks without show at the top as unplaced.

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

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm

function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

  // Tasks with estimates get stacked in timeline; others shown at top
  const timedTasks = dayTasks.filter(t => t.estimatedMinutes);
  const untimedTasks = dayTasks.filter(t => !t.estimatedMinutes);

  // Auto-stack timed tasks starting from 9am
  const stackedTasks = useMemo(() => {
    let currentMinute = 60; // offset from 8am start => 9am
    return timedTasks.map(task => {
      const startOffset = currentMinute;
      currentMinute += task.estimatedMinutes;
      return { task, startOffset, duration: task.estimatedMinutes };
    });
  }, [timedTasks]);

  const totalMinutes = 12 * 60; // 8am to 8pm = 720 minutes
  const getProject = id => projects.find(p => p.id === id);

  return (
    <div className="tl-container">
      <div className="tl-header">
        <FaClock className="tl-header-icon" />
        <span className="tl-header-title">Timeline</span>
      </div>

      {/* Untimed tasks */}
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

      {/* Timeline grid */}
      <div className="tl-grid">
        {/* Hour lines */}
        {HOURS.map(hour => (
          <div key={hour} className="tl-hour" style={{ top: `${((hour - 8) * 60 / totalMinutes) * 100}%` }}>
            <span className="tl-hour-label">{hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'p' : 'a'}</span>
            <div className="tl-hour-line" />
          </div>
        ))}

        {/* Task blocks */}
        {stackedTasks.map(({ task, startOffset, duration }) => {
          const project = getProject(task.projectId);
          const top = (startOffset / totalMinutes) * 100;
          const height = Math.max((duration / totalMinutes) * 100, 2.5); // min height
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
              <span className="tl-block-title">{task.title}</span>
              <span className="tl-block-time">{formatMinutes(duration)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Create `src/components/DailyTimeline.css`**

```css
/* ── Daily Timeline ── */
.tl-container {
  width: 220px;
  flex-shrink: 0;
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  position: sticky;
  top: 84px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.tl-header {
  padding: 12px 14px 8px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid #F1F5F9;
}
.tl-header-icon { color: #3B82F6; font-size: 14px; }
.tl-header-title { font-size: 13px; font-weight: 700; color: #1E293B; }

/* Untimed tasks */
.tl-untimed { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; }
.tl-untimed-label { font-size: 10px; color: #94A3B8; font-weight: 600; display: block; margin-bottom: 4px; }
.tl-untimed-task { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.tl-untimed-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.tl-untimed-name { font-size: 11px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Grid */
.tl-grid {
  position: relative;
  height: 600px;
  margin: 8px 0;
}

/* Hour lines */
.tl-hour {
  position: absolute; left: 0; right: 0;
  display: flex; align-items: center; height: 0;
}
.tl-hour-label {
  font-size: 9px; color: #94A3B8; font-weight: 600;
  width: 28px; text-align: right; padding-right: 4px; flex-shrink: 0;
}
.tl-hour-line { flex: 1; height: 1px; background: #F1F5F9; }

/* Task blocks */
.tl-block {
  position: absolute; left: 34px; right: 8px;
  border-left: 3px solid; border-radius: 4px;
  padding: 4px 8px; overflow: hidden;
  display: flex; flex-direction: column; justify-content: center;
  min-height: 18px;
}
.tl-block-title {
  font-size: 11px; font-weight: 600; color: #1E293B;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tl-block-time { font-size: 9px; color: #64748B; }
```

**Step 3: Commit**

```bash
git add src/components/DailyTimeline.jsx src/components/DailyTimeline.css
git commit -m "feat: create DailyTimeline vertical timeline component"
```

---

## Task 10: DailyShutdown Component

**Files:**
- Create: `src/components/DailyShutdown.jsx`
- Create: `src/components/DailyShutdown.css`

**Step 1: Create `src/components/DailyShutdown.jsx`**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FaMoon, FaArrowRight, FaChevronDown, FaChevronRight, FaClock } from 'react-icons/fa';
import { format, addDays } from 'date-fns';
import { dailyNoteService, taskService } from '../api';
import './DailyShutdown.css';

function formatMinutes(min) {
  if (!min) return '0m';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function DailyShutdown({ dateStr, dayTasks, onDataChange }) {
  const [collapsed, setCollapsed] = useState(true);
  const [highlights, setHighlights] = useState('');
  const [savedHighlights, setSavedHighlights] = useState('');
  const [loading, setLoading] = useState(false);

  const loadNote = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dailyNoteService.getByDate(dateStr);
      setHighlights(data.highlights || '');
      setSavedHighlights(data.highlights || '');
    } catch (e) {
      console.error('Failed to load daily note:', e);
    }
    setLoading(false);
  }, [dateStr]);

  useEffect(() => { loadNote(); }, [loadNote]);

  // Compute stats
  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(t => t.status === 'completed').length;
  const incompleteTasks = dayTasks.filter(t => t.status !== 'completed');
  const totalEstimated = dayTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const completedEstimated = dayTasks.filter(t => t.status === 'completed').reduce((s, t) => s + (t.estimatedMinutes || 0), 0);

  const saveHighlights = async () => {
    try {
      await dailyNoteService.upsert({ date: dateStr, highlights });
      setSavedHighlights(highlights);
    } catch (e) {
      console.error('Failed to save highlights:', e);
    }
  };

  const rolloverTask = async (task) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const tomorrow = format(addDays(new Date(y, m - 1, d), 1), 'yyyy-MM-dd');
    try {
      await taskService.update(task.id, { dueDate: new Date(tomorrow).toISOString() });
      if (onDataChange) onDataChange();
    } catch (e) {
      console.error('Failed to rollover task:', e);
    }
  };

  const rolloverAll = async () => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const tomorrow = format(addDays(new Date(y, m - 1, d), 1), 'yyyy-MM-dd');
    for (const task of incompleteTasks) {
      if (task.isRecurringInstance) continue; // skip recurring instances
      try {
        await taskService.update(task.id, { dueDate: new Date(tomorrow).toISOString() });
      } catch (e) {
        console.error('Failed to rollover task:', task.title, e);
      }
    }
    if (onDataChange) onDataChange();
  };

  const isDirty = highlights !== savedHighlights;

  return (
    <div className="sd-container">
      <button className="sd-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        <FaMoon className="sd-icon" />
        <span className="sd-title">Daily Shutdown</span>
      </button>

      {!collapsed && (
        <div className="sd-body">
          {/* Time summary */}
          <div className="sd-stats">
            <div className="sd-stat">
              <span className="sd-stat-label">Completed</span>
              <span className="sd-stat-value">{completedTasks}/{totalTasks}</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-label">Time planned</span>
              <span className="sd-stat-value"><FaClock /> {formatMinutes(totalEstimated)}</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-label">Time done</span>
              <span className="sd-stat-value sd-stat-value--done"><FaClock /> {formatMinutes(completedEstimated)}</span>
            </div>
          </div>

          {/* Incomplete tasks — rollover */}
          {incompleteTasks.length > 0 && (
            <div className="sd-rollover">
              <div className="sd-rollover-header">
                <span className="sd-rollover-label">Incomplete ({incompleteTasks.length})</span>
                <button className="sd-rollover-all" onClick={rolloverAll}>
                  Move all to tomorrow <FaArrowRight />
                </button>
              </div>
              <ul className="sd-rollover-list">
                {incompleteTasks.map(task => (
                  <li key={task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id} className="sd-rollover-item">
                    <span className="sd-rollover-name">{task.title}</span>
                    {!task.isRecurringInstance && (
                      <button className="sd-rollover-btn" onClick={() => rolloverTask(task)} title="Move to tomorrow">
                        <FaArrowRight />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlights */}
          <div className="sd-highlights">
            <label className="sd-highlights-label">Daily highlights / notes</label>
            <textarea
              className="sd-highlights-input"
              value={highlights}
              onChange={e => setHighlights(e.target.value)}
              placeholder="What went well today? What did you accomplish?"
              rows={3}
            />
            {isDirty && (
              <button className="sd-save-btn" onClick={saveHighlights}>Save</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create `src/components/DailyShutdown.css`**

```css
/* ── Daily Shutdown ── */
.sd-container {
  background: white; border: 1.5px solid #E2E8F0; border-radius: 10px;
  margin-top: 12px; overflow: hidden;
}

.sd-toggle {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 14px; background: none; border: none; cursor: pointer;
  font-family: inherit; text-align: left;
  color: #64748B; font-size: 12px;
}
.sd-toggle:hover { background: #F8FAFC; }
.sd-icon { color: #6366F1; font-size: 14px; }
.sd-title { font-size: 13px; font-weight: 700; color: #1E293B; }

.sd-body { padding: 0 14px 14px; }

/* Stats */
.sd-stats {
  display: flex; gap: 12px; margin-bottom: 12px;
  padding: 8px 0; border-bottom: 1px solid #F1F5F9;
}
.sd-stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
.sd-stat-label { font-size: 10px; color: #94A3B8; font-weight: 600; text-transform: uppercase; }
.sd-stat-value {
  font-size: 14px; font-weight: 700; color: #1E293B;
  display: flex; align-items: center; gap: 4px;
}
.sd-stat-value--done { color: #16A34A; }

/* Rollover */
.sd-rollover { margin-bottom: 12px; }
.sd-rollover-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.sd-rollover-label { font-size: 12px; font-weight: 700; color: #DC2626; }
.sd-rollover-all {
  background: none; border: 1.5px solid #E2E8F0; border-radius: 5px;
  padding: 3px 10px; font-size: 11px; font-weight: 600; color: #64748B;
  cursor: pointer; display: flex; align-items: center; gap: 4px;
  font-family: inherit; transition: all 0.12s;
}
.sd-rollover-all:hover { background: #FFF7ED; border-color: #F97316; color: #F97316; }

.sd-rollover-list { list-style: none; padding: 0; margin: 0; }
.sd-rollover-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 0; font-size: 13px; color: #1E293B;
}
.sd-rollover-name { flex: 1; }
.sd-rollover-btn {
  background: none; border: 1px solid #E2E8F0; border-radius: 4px;
  padding: 2px 8px; cursor: pointer; color: #94A3B8; font-size: 11px;
  transition: all 0.12s;
}
.sd-rollover-btn:hover { color: #F97316; border-color: #F97316; }

/* Highlights */
.sd-highlights-label { font-size: 12px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 4px; }
.sd-highlights-input {
  width: 100%; padding: 8px; border: 1.5px solid #E2E8F0; border-radius: 6px;
  font-size: 13px; font-family: inherit; resize: vertical; outline: none;
  transition: border-color 0.12s;
}
.sd-highlights-input:focus { border-color: #94A3B8; }
.sd-save-btn {
  margin-top: 6px; background: #F97316; color: white; border: none;
  border-radius: 5px; padding: 5px 16px; font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: background 0.12s;
}
.sd-save-btn:hover { background: #EA580C; }
```

**Step 3: Commit**

```bash
git add src/components/DailyShutdown.jsx src/components/DailyShutdown.css
git commit -m "feat: create DailyShutdown component with rollover and highlights"
```

---

## Task 11: DailyPlanner — Main Orchestrator Component

This is the top-level component that assembles all the pieces into the 3-panel layout.

**Files:**
- Create: `src/components/DailyPlanner.jsx`
- Create: `src/components/DailyPlanner.css`

**Step 1: Create `src/components/DailyPlanner.jsx`**

```jsx
import React, { useState, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { FaPlus } from 'react-icons/fa';
import BacklogSidebar from './BacklogSidebar';
import DayColumn from './DayColumn';
import MiniWeekBar from './MiniWeekBar';
import WeeklyObjectives from './WeeklyObjectives';
import DailyTimeline from './DailyTimeline';
import DailyShutdown from './DailyShutdown';
import { generateRecurringTasks } from '../utils/recurrence';
import { taskService } from '../api';
import './DailyPlanner.css';

function todayStr() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

export default function DailyPlanner({
  tasks,
  projects,
  teamMembers,
  subtasks,
  onTaskClick,
  onStatusUpdate,
  onNewTask,
  onDeleteTask,
  onSubtaskToggle,
  onAssignDate,
  onDataChange,
}) {
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Parse selected date
  const [y, m, d] = selectedDate.split('-').map(Number);
  const selectedDateObj = new Date(y, m - 1, d);

  // Get day tasks for the selected (expanded) day — needed for shutdown
  const expandedDayTasks = useMemo(() => {
    const dayStart = new Date(y, m - 1, d);
    const dayEnd = new Date(y, m - 1, d + 1);
    const result = [];
    for (const task of tasks) {
      if (task.isRecurring && task.dueDate) {
        result.push(...generateRecurringTasks(task, dayStart, dayEnd));
      } else if (task.dueDate && toLocalDateStr(task.dueDate) === selectedDate) {
        result.push(task);
      }
    }
    return result;
  }, [tasks, selectedDate, y, m, d]);

  // Week navigation
  const handlePrevWeek = () => {
    const newDate = addDays(selectedDateObj, -7);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };
  const handleNextWeek = () => {
    const newDate = addDays(selectedDateObj, 7);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  // Handle estimate change (inline on task card)
  const handleEstimateChange = useCallback(async (task, minutes) => {
    const taskId = task.isRecurringInstance ? task.recurringSourceId : task.id;
    try {
      await taskService.update(taskId, { estimatedMinutes: minutes });
      if (onDataChange) onDataChange();
    } catch (e) {
      console.error('Failed to update estimate:', e);
    }
  }, [onDataChange]);

  // Drag-and-drop: drop onto a day column
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dateStr = e.currentTarget.getAttribute('data-date');
    if (!dateStr) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.taskId) {
        const task = tasks.find(t => t.id === data.taskId);
        if (task) {
          onAssignDate(task, new Date(dateStr));
        }
      }
    } catch (err) {
      // Invalid drag data
    }
  }, [tasks, onAssignDate]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Get week days for mini-week display in center panel
  const weekStart = startOfWeek(selectedDateObj, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));

  return (
    <div className="dp-layout">
      {/* LEFT: Backlog Sidebar */}
      <BacklogSidebar
        tasks={tasks}
        projects={projects}
        onTaskClick={onTaskClick}
        onAssignDate={onAssignDate}
        onDeleteTask={onDeleteTask}
      />

      {/* CENTER: Main Planner Area */}
      <div className="dp-center">
        {/* Weekly Objectives */}
        <WeeklyObjectives selectedDate={selectedDate} />

        {/* Mini Week Navigation */}
        <MiniWeekBar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          tasks={tasks}
        />

        {/* Day Columns: expanded selected day + mini others */}
        <div className="dp-columns">
          {weekDays.map(dayStr => (
            <DayColumn
              key={dayStr}
              dateStr={dayStr}
              tasks={tasks}
              projects={projects}
              teamMembers={teamMembers}
              subtasks={subtasks}
              expanded={dayStr === selectedDate}
              onTaskClick={onTaskClick}
              onStatusUpdate={onStatusUpdate}
              onNewTask={onNewTask}
              onDeleteTask={onDeleteTask}
              onSubtaskToggle={onSubtaskToggle}
              onEstimateChange={handleEstimateChange}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>

        {/* Daily Shutdown — inline at bottom */}
        <DailyShutdown
          dateStr={selectedDate}
          dayTasks={expandedDayTasks}
          onDataChange={onDataChange}
        />
      </div>

      {/* RIGHT: Timeline */}
      <DailyTimeline
        dateStr={selectedDate}
        tasks={tasks}
        projects={projects}
      />
    </div>
  );
}
```

**Step 2: Create `src/components/DailyPlanner.css`**

```css
/* ── Daily Planner Layout ── */
.dp-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.dp-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Day columns row */
.dp-columns {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  overflow-x: auto;
}

/* Ensure mini columns are narrow */
.dp-columns .dc-column:not(.dc-column--expanded) {
  flex: 1;
  min-width: 100px;
  max-width: 140px;
}

/* Responsive */
@media (max-width: 1200px) {
  .dp-layout {
    flex-direction: column;
  }

  .backlog-sidebar {
    width: 100%;
    position: static;
    max-height: none;
  }

  .tl-container {
    width: 100%;
    position: static;
    max-height: none;
  }

  .dp-columns {
    flex-wrap: wrap;
  }

  .dp-columns .dc-column:not(.dc-column--expanded) {
    max-width: none;
    min-width: 120px;
  }
}

@media (max-width: 768px) {
  .dp-columns .dc-column:not(.dc-column--expanded) {
    display: none; /* Hide mini columns on mobile, just show expanded */
  }
}
```

**Step 3: Commit**

```bash
git add src/components/DailyPlanner.jsx src/components/DailyPlanner.css
git commit -m "feat: create DailyPlanner orchestrator component"
```

---

## Task 12: Integrate DailyPlanner into App.jsx

**Files:**
- Modify: `src/App.jsx`

**Step 1: Import DailyPlanner**

Add at the top of App.jsx with other component imports:

```javascript
import DailyPlanner from './components/DailyPlanner';
```

**Step 2: Change default `activeView` from `'calendar'` to `'planner'`**

Change line 43:
```javascript
const [activeView, setActiveView] = useState('planner');
```

**Step 3: Update nav buttons**

Replace the Calendar nav button (line ~337) with a Planner button:

Old:
```jsx
<button className={`nav-btn${activeView === 'calendar' ? ' active' : ''}`} onClick={() => setActiveView('calendar')}>
  <FaCalendar /> Calendar
</button>
```

New:
```jsx
<button className={`nav-btn${activeView === 'planner' ? ' active' : ''}`} onClick={() => setActiveView('planner')}>
  <FaCalendar /> Planner
</button>
```

Remove the Outstanding nav button entirely (the backlog sidebar replaces it).

**Step 4: Add the planner view rendering**

In the conditional view rendering section, replace the `calendar` and `outstanding` blocks with:

```jsx
{activeView === 'planner' && (
  <DailyPlanner
    tasks={tasks}
    projects={projects}
    teamMembers={teamMembers}
    subtasks={subtasks}
    onTaskClick={handleTaskClick}
    onStatusUpdate={handleStatusUpdate}
    onNewTask={handleNewTaskForDay}
    onDeleteTask={handleDeleteTask}
    onSubtaskToggle={handleSubtaskToggle}
    onAssignDate={handleAssignDate}
    onDataChange={loadData}
  />
)}
```

**Step 5: Keep the old calendar/outstanding views accessible (optional, but recommended)**

Keep the old view code but behind a hidden nav toggle — or simply delete it. Per the user's decision, Calendar + Outstanding are **replaced**. Remove their conditional render blocks and their nav buttons.

The toolbar (New Task, New Project, stats) should still appear for the planner view. Move the New Task button into the planner's toolbar area, or keep it in the App.jsx toolbar section for the planner view.

**Step 6: Simplify the toolbar for planner view**

The toolbar for the planner view should show:
- "New Task" button (opens TaskModal with no pre-filled date)
- "New Project" button
- Stats cards (total, in progress, done)

Keep the existing toolbar JSX but update the condition from `activeView === 'calendar'` to `activeView === 'planner'`.

**Step 7: Update `handleNewTaskForDay` to work with DailyPlanner**

The existing `handleNewTaskForDay(dateStr)` function already takes a date string and opens the task modal — no change needed.

**Step 8: Update `handleAssignDate` to accept Date or string**

Check that `handleAssignDate(task, date)` at line 216 works when `date` is a `Date` object constructed from a `YYYY-MM-DD` string. It currently calls `taskService.update(task.id, { dueDate: date.toISOString() })`. This should work, but verify the ISO string is correct (should be midnight UTC for the date).

Consider updating to ensure local-date correctness:
```javascript
const handleAssignDate = async (task, date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  await taskService.update(task.id, { dueDate: d.toISOString() });
  loadData();
};
```

**Step 9: Test manually**

- Start dev server: `npm run dev`
- Navigate to `http://localhost:5173`
- Verify the Planner view loads as default
- Verify backlog shows unscheduled tasks
- Verify day columns show tasks for each day
- Verify clicking a day in mini-week expands it
- Verify the timeline shows on the right
- Verify weekly objectives can be added
- Verify daily shutdown section works

**Step 10: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate DailyPlanner as default view, replace Calendar + Outstanding"
```

---

## Task 13: Clean Up — Remove Old Calendar/Outstanding View Code

**Files:**
- Modify: `src/App.jsx` — remove dead code for `calendar` and `outstanding` views
- Do NOT delete `Calendar.jsx`, `DayPanel.jsx`, `OutstandingTasks.jsx` files yet — keep them in case user wants to bring them back

**Step 1: Remove the old conditional render blocks**

Remove the `{activeView === 'calendar' && (...)}` and `{activeView === 'outstanding' && (...)}` blocks from App.jsx. Keep the component files themselves.

**Step 2: Remove unused imports**

If `Calendar`, `DayPanel`, `OutstandingTasks` are no longer imported, remove those import lines.

**Step 3: Clean up unused state**

- `selectedDayDate` state (line 46) was used by DayPanel — it may no longer be needed if DailyPlanner manages its own selected date. Remove if unused.
- `outstandingCount` derived value (line 324) was used for the nav badge — remove if nav button is gone.

**Step 4: Verify no regressions**

```bash
npm run test:run
npm run lint
```

**Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: remove old calendar and outstanding view code from App.jsx"
```

---

## Task 14: Write Tests for New Components

**Files:**
- Create: `src/__tests__/DayColumn.test.jsx`
- Create: `src/__tests__/BacklogSidebar.test.jsx`
- Create: `src/__tests__/MiniWeekBar.test.jsx`

**Step 1: Write DayColumn tests**

Test:
- Renders tasks for the given date
- Shows "No tasks" empty state
- Cycles task status on click
- Shows inline time estimate editor
- Shows subtask checklist in expanded mode

**Step 2: Write BacklogSidebar tests**

Test:
- Renders only unscheduled tasks (no dueDate)
- Groups tasks by project
- Filters by project
- Search filters by title

**Step 3: Write MiniWeekBar tests**

Test:
- Renders 7 day buttons (Mon-Sun)
- Highlights today
- Highlights selected date
- Calls onSelectDate when clicking a day
- Calls onPrevWeek/onNextWeek

**Step 4: Run tests**

```bash
npm run test:run
```

Fix any failures.

**Step 5: Commit**

```bash
git add src/__tests__/
git commit -m "test: add tests for DayColumn, BacklogSidebar, MiniWeekBar"
```

---

## Task 15: Final Verification

**Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: All existing tests pass + new tests pass (pre-existing failure in habits.test.js is acceptable).

**Step 2: Run lint**

```bash
npm run lint
```

Expected: No new lint errors.

**Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Manual testing**

Start dev server and test:
1. Default view is Planner
2. Backlog sidebar shows unscheduled tasks, grouped by project
3. Click task in backlog to edit it
4. Drag task from backlog to a day column — task gets scheduled
5. Expanded day shows full task cards with status cycling
6. Inline time estimate: click clock icon, enter minutes, press OK/Enter
7. Mini week: click different days to expand them
8. Mini week: navigate to previous/next week with arrows
9. Weekly objectives: add/remove goals, persisted across refreshes
10. Daily timeline: tasks with estimates show as blocks
11. Daily shutdown: see stats, rollover incomplete tasks, write highlights
12. Nav: Team and Habits views still work
13. New Task button creates task
14. New Project button creates project
15. Task modal includes Estimated Time field

**Step 5: Commit if any fixes needed**

```bash
git add .
git commit -m "fix: polish planner integration issues"
```

---

## Summary of New Files Created

| File | Purpose |
|------|---------|
| `src/components/DailyPlanner.jsx` | 3-panel layout orchestrator |
| `src/components/DailyPlanner.css` | Layout styles |
| `src/components/BacklogSidebar.jsx` | Left panel — unscheduled tasks |
| `src/components/BacklogSidebar.css` | Backlog styles |
| `src/components/DayColumn.jsx` | Day task list with time boxing |
| `src/components/DayColumn.css` | Day column styles |
| `src/components/MiniWeekBar.jsx` | Week navigation |
| `src/components/MiniWeekBar.css` | Mini week styles |
| `src/components/WeeklyObjectives.jsx` | Weekly goals |
| `src/components/WeeklyObjectives.css` | Weekly objectives styles |
| `src/components/DailyTimeline.jsx` | Vertical timeline |
| `src/components/DailyTimeline.css` | Timeline styles |
| `src/components/DailyShutdown.jsx` | End-of-day review |
| `src/components/DailyShutdown.css` | Shutdown styles |
| `server/routes/weeklyObjectives.js` | API for weekly goals |
| `server/routes/dailyNotes.js` | API for daily notes |
| `src/__tests__/DayColumn.test.jsx` | DayColumn tests |
| `src/__tests__/BacklogSidebar.test.jsx` | BacklogSidebar tests |
| `src/__tests__/MiniWeekBar.test.jsx` | MiniWeekBar tests |

## Summary of Modified Files

| File | Change |
|------|--------|
| `server/db.js` | Add `estimatedMinutes` column, `weekly_objectives` table, `daily_notes` table |
| `server/routes/tasks.js` | Include `estimatedMinutes` in POST/PUT |
| `server/index.js` | Register 2 new routes |
| `src/api.js` | Add `weeklyObjectiveService`, `dailyNoteService` |
| `src/components/TaskModal.jsx` | Add estimated time form field |
| `src/App.jsx` | Replace Calendar+Outstanding with DailyPlanner, update nav |
