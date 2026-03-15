# Task Status Simplification and Yearly Goals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify task status to completed/pending, show all outstanding tasks in backlog, and add yearly goals panel.

**Architecture:** Backend-first approach with SQLite migration, then frontend updates. Use existing patterns from weeklyObjectives for yearly goals API.

**Tech Stack:** React 19, Express.js, better-sqlite3, date-fns

---

## Task 1: Backend - Add Yearly Goals Table and Migration

**Files:**
- Modify: `server/db.js:100-127`
- Create: `server/routes/yearlyGoals.js`

**Step 1: Add yearly_goals table to schema**

In `server/db.js`, add after the daily_notes table (around line 100):

```javascript
  CREATE TABLE IF NOT EXISTS yearly_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    goals TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(year)
  );
```

**Step 2: Add migration for task status**

Add after all CREATE TABLE statements (around line 101):

```javascript
// Migrate task status: todo/in-progress → pending
db.exec(`
  UPDATE tasks SET status = 'pending' WHERE status = 'todo';
  UPDATE tasks SET status = 'pending' WHERE status = 'in-progress';
`);
```

**Step 3: Verify migration**

Run: `npm run dev` (starts backend server)
Check console for no errors.

Run SQLite query to verify:
```bash
sqlite3 data/app.db "SELECT DISTINCT status FROM tasks;"
```
Expected: Only `pending` and `completed` values

**Step 4: Commit backend schema changes**

```bash
git add server/db.js
git commit -m "feat: add yearly_goals table and migrate task status to pending/completed"
```

---

## Task 2: Backend - Yearly Goals API Routes

**Files:**
- Create: `server/routes/yearlyGoals.js`
- Modify: `server/index.js` (add route)

**Step 1: Create yearly goals route file**

Create `server/routes/yearlyGoals.js`:

```javascript
import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET / — get goals for a specific year (query: ?year=2026)
router.get('/', (req, res) => {
  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'year query parameter required' });
  }
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) {
    return res.status(400).json({ error: 'year must be a number' });
  }
  
  const row = db.prepare('SELECT * FROM yearly_goals WHERE year = ?').get(yearNum);
  if (!row) return res.json({ year: yearNum, goals: '' });
  res.json(row);
});

// PUT / — upsert goals for a year
router.put('/', (req, res) => {
  const { year, goals } = req.body;
  if (!year || typeof goals !== 'string') {
    return res.status(400).json({ error: 'year (number) and goals (string) required' });
  }
  
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) {
    return res.status(400).json({ error: 'year must be a number' });
  }
  
  const existing = db.prepare('SELECT id FROM yearly_goals WHERE year = ?').get(yearNum);
  if (existing) {
    db.prepare('UPDATE yearly_goals SET goals = ?, updatedAt = datetime(\'now\') WHERE id = ?')
      .run(goals, existing.id);
    const updated = db.prepare('SELECT * FROM yearly_goals WHERE id = ?').get(existing.id);
    res.json(updated);
  } else {
    const result = db.prepare('INSERT INTO yearly_goals (year, goals) VALUES (?, ?)')
      .run(yearNum, goals);
    const created = db.prepare('SELECT * FROM yearly_goals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  }
});

export default router;
```

**Step 2: Register route in server**

In `server/index.js`, find where routes are imported (around line 5-10), add:

```javascript
import yearlyGoalsRouter from './routes/yearlyGoals.js';
```

Then find where routes are registered (around line 20-30), add:

```javascript
app.use('/api/yearly-goals', yearlyGoalsRouter);
```

**Step 3: Test the API manually**

Start server: `npm run dev`

Test GET (should return empty goals):
```bash
curl "http://localhost:3001/api/yearly-goals?year=2026"
```
Expected: `{"year":2026,"goals":""}`

Test PUT:
```bash
curl -X PUT http://localhost:3001/api/yearly-goals \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"goals":"Test goal"}'
```
Expected: JSON with id, year, goals, timestamps

Test GET again:
```bash
curl "http://localhost:3001/api/yearly-goals?year=2026"
```
Expected: `{"id":1,"year":2026,"goals":"Test goal",...}`

**Step 4: Commit yearly goals API**

```bash
git add server/routes/yearlyGoals.js server/index.js
git commit -m "feat: add yearly goals API endpoints"
```

---

## Task 3: Frontend - Add Yearly Goals Service

**Files:**
- Modify: `src/api.js:82` (add after dailyNoteService)

**Step 1: Add yearlyGoalService to api.js**

In `src/api.js`, add after the `dailyNoteService` export (line 82):

```javascript
export const yearlyGoalService = {
  getByYear: (year) => request(`/api/yearly-goals?year=${year}`),
  upsert: (data) => request('/api/yearly-goals', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};
```

**Step 2: Verify TypeScript/linting**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit service layer**

```bash
git add src/api.js
git commit -m "feat: add yearlyGoalService to API layer"
```

---

## Task 4: Frontend - Create YearlyGoals Component

**Files:**
- Create: `src/components/YearlyGoals.jsx`
- Create: `src/components/YearlyGoals.css`

**Step 1: Create YearlyGoals component**

Create `src/components/YearlyGoals.jsx`:

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { yearlyGoalService } from '../api';
import './YearlyGoals.css';

export default function YearlyGoals() {
  const currentYear = new Date().getFullYear();
  const [goals, setGoals] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('yearlyGoals.collapsed') === 'true'
  );
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Load goals on mount
  useEffect(() => {
    loadGoals();
  }, [currentYear]);

  const loadGoals = async () => {
    try {
      const data = await yearlyGoalService.getByYear(currentYear);
      setGoals(data.goals || '');
    } catch (err) {
      console.error('Failed to load yearly goals:', err);
    }
  };

  const saveGoals = async (goalsText) => {
    setIsSaving(true);
    try {
      await yearlyGoalService.upsert({ year: currentYear, goals: goalsText });
    } catch (err) {
      console.error('Failed to save yearly goals:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const newGoals = e.target.value;
    setGoals(newGoals);

    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveGoals(newGoals);
    }, 2000);
  };

  const handleBlur = () => {
    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveGoals(goals);
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('yearlyGoals.collapsed', String(newCollapsed));
  };

  return (
    <div className="yearly-goals">
      <div className="yearly-goals-header" onClick={toggleCollapse}>
        <h3 className="yearly-goals-title">{currentYear} Goals</h3>
        <div className="yearly-goals-actions">
          {isSaving && <span className="yearly-goals-saving">Saving...</span>}
          <button className="yearly-goals-toggle" type="button">
            {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="yearly-goals-body">
          <textarea
            className="yearly-goals-textarea"
            placeholder="What are your goals for this year?"
            value={goals}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={6}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create YearlyGoals styles**

Create `src/components/YearlyGoals.css`:

```css
.yearly-goals {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.yearly-goals-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid #e5e7eb;
}

.yearly-goals-header:hover {
  background-color: #f9fafb;
}

.yearly-goals-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.yearly-goals-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.yearly-goals-saving {
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

.yearly-goals-toggle {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
}

.yearly-goals-toggle:hover {
  color: #1f2937;
}

.yearly-goals-body {
  padding: 1rem;
}

.yearly-goals-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 120px;
}

.yearly-goals-textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.yearly-goals-textarea::placeholder {
  color: #9ca3af;
}
```

**Step 3: Test component in isolation**

Run: `npm run dev`
Open browser to http://localhost:5173
(Component will be integrated in next task)

**Step 4: Commit YearlyGoals component**

```bash
git add src/components/YearlyGoals.jsx src/components/YearlyGoals.css
git commit -m "feat: create YearlyGoals collapsible component with auto-save"
```

---

## Task 5: Frontend - Integrate YearlyGoals into DailyPlanner

**Files:**
- Modify: `src/components/DailyPlanner.jsx:12,204`

**Step 1: Import YearlyGoals component**

In `src/components/DailyPlanner.jsx`, add to imports (around line 8):

```javascript
import YearlyGoals from './YearlyGoals';
```

**Step 2: Add component to layout**

Find the render method where `WeeklyObjectives` is rendered (around line 140-150).
Add `YearlyGoals` ABOVE `WeeklyObjectives`:

Look for this structure:
```javascript
return (
  <div className="daily-planner">
    {/* ... MiniWeekBar ... */}
    <WeeklyObjectives weekStart={...} />
```

Change to:
```javascript
return (
  <div className="daily-planner">
    {/* ... MiniWeekBar ... */}
    <YearlyGoals />
    <WeeklyObjectives weekStart={...} />
```

**Step 3: Test integration**

Run: `npm run dev`
Open browser: http://localhost:5173

Expected:
- Yearly goals panel appears above weekly objectives
- Click header to collapse/expand
- Type in textarea, should see "Saving..." after 2 seconds
- Refresh page, goals should persist
- Panel collapsed state persists across refreshes

**Step 4: Commit integration**

```bash
git add src/components/DailyPlanner.jsx
git commit -m "feat: integrate YearlyGoals panel above WeeklyObjectives"
```

---

## Task 6: Frontend - Update TaskModal Status Dropdown

**Files:**
- Modify: `src/components/TaskModal.jsx:15,538-548`

**Step 1: Update default status in formData**

In `src/components/TaskModal.jsx`, find the initial `formData` state (around line 15).
Change:
```javascript
status: 'todo',
```
To:
```javascript
status: 'pending',
```

**Step 2: Update status dropdown options**

Find the status select dropdown (around line 538-548):

```javascript
<select
  id="status"
  name="status"
  value={formData.status}
  onChange={handleChange}
>
  <option value="todo">To Do</option>
  <option value="in-progress">In Progress</option>
  <option value="completed">Completed</option>
</select>
```

Replace with:
```javascript
<select
  id="status"
  name="status"
  value={formData.status}
  onChange={handleChange}
>
  <option value="pending">Pending</option>
  <option value="completed">Completed</option>
</select>
```

**Step 3: Test task modal**

Run: `npm run dev`
Open browser, create a new task.

Expected:
- Status dropdown shows only "Pending" and "Completed"
- Default status is "Pending"
- Can create task successfully
- Can edit existing task and change status

**Step 4: Commit status dropdown changes**

```bash
git add src/components/TaskModal.jsx
git commit -m "feat: simplify task status to pending/completed in TaskModal"
```

---

## Task 7: Frontend - Update Stats Display in App.jsx

**Files:**
- Modify: `src/App.jsx:332-337`

**Step 1: Update stats labels and filters**

In `src/App.jsx`, find the stats display (around line 321-338):

```javascript
<div className="stat-card">
  <span className="stat-label">Active</span>
  <span className="stat-value" style={{ color: '#6366F1' }}>
    {tasks.filter((t) => t.status === 'in-progress').length}
  </span>
</div>
```

Replace with:
```javascript
<div className="stat-card">
  <span className="stat-label">Pending</span>
  <span className="stat-value" style={{ color: '#6366F1' }}>
    {tasks.filter((t) => t.status === 'pending').length}
  </span>
</div>
```

**Step 2: Test stats display**

Run: `npm run dev`
Create some tasks with different statuses.

Expected:
- Stats show "Total", "Done", "Pending"
- Pending count shows all non-completed tasks
- Counts update when tasks change status

**Step 3: Commit stats update**

```bash
git add src/App.jsx
git commit -m "feat: update task stats to show Pending instead of Active"
```

---

## Task 8: Frontend - Update BacklogSidebar to Show All Pending Tasks

**Files:**
- Modify: `src/components/BacklogSidebar.jsx:5,9-17,44,73-77`

**Step 1: Add view mode toggle state**

In `src/components/BacklogSidebar.jsx`, add state for view mode (around line 7):

```javascript
const [filterProject, setFilterProject] = useState('');
const [searchQuery, setSearchQuery] = useState('');
const [viewMode, setViewMode] = useState('all-pending'); // 'all-pending' | 'unscheduled'
```

**Step 2: Update task filtering logic**

Replace the `unscheduledTasks` useMemo (around line 9-17):

```javascript
const displayTasks = useMemo(() => {
  let result = viewMode === 'unscheduled' 
    ? tasks.filter(t => !t.dueDate && t.status === 'pending')
    : tasks.filter(t => t.status === 'pending');
  
  if (filterProject) result = result.filter(t => String(t.projectId) === filterProject);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(q));
  }
  
  // Sort by priority, then creation date
  return result.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}, [tasks, viewMode, filterProject, searchQuery]);
```

**Step 3: Update grouped tasks reference**

Change all references from `unscheduledTasks` to `displayTasks`:

Line 19-27:
```javascript
const grouped = useMemo(() => {
  const map = new Map();
  for (const task of displayTasks) {
    const pId = task.projectId || 0;
    if (!map.has(pId)) map.set(pId, []);
    map.get(pId).push(task);
  }
  return map;
}, [displayTasks]);
```

Line 42:
```javascript
<span className="backlog-count">{displayTasks.length}</span>
```

**Step 4: Add view mode toggle UI**

After the subtitle (around line 44), add toggle buttons:

```javascript
<p className="backlog-subtitle">
  {viewMode === 'all-pending' ? 'All outstanding tasks' : 'Drag tasks to a day'}
</p>
<div className="backlog-view-toggle">
  <button
    className={`view-toggle-btn ${viewMode === 'all-pending' ? 'active' : ''}`}
    onClick={() => setViewMode('all-pending')}
  >
    All Pending
  </button>
  <button
    className={`view-toggle-btn ${viewMode === 'unscheduled' ? 'active' : ''}`}
    onClick={() => setViewMode('unscheduled')}
  >
    Unscheduled
  </button>
</div>
```

**Step 5: Update empty state text**

Replace the empty state (around line 73-78):

```javascript
{displayTasks.length === 0 ? (
  <div className="backlog-empty">
    {viewMode === 'all-pending'
      ? 'All tasks completed! 🎉'
      : (tasks.filter(t => !t.dueDate && t.status === 'pending').length === 0
          ? 'All tasks scheduled!'
          : 'No tasks match filters')}
  </div>
) : (
```

**Step 6: Add overdue indicator in task rendering**

Update the task rendering to show overdue badge (around line 88-100):

```javascript
{groupTasks.map(task => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status === 'pending';
  return (
    <div
      key={task.id}
      className={`backlog-task ${isOverdue ? 'overdue' : ''}`}
      draggable
      onDragStart={e => handleDragStart(e, task)}
    >
      <FaGripVertical className="backlog-grip" />
      <span className="backlog-task-title" onClick={() => onTaskClick(task)}>
        {task.title}
        {isOverdue && <span className="overdue-badge">Overdue</span>}
      </span>
      <span className={`backlog-priority backlog-priority--${task.priority}`} />
    </div>
  );
})}
```

**Step 7: Add CSS for new elements**

In `src/components/BacklogSidebar.css`, add:

```css
.backlog-view-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0 0.75rem;
}

.view-toggle-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 0.813rem;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle-btn:hover {
  background: #f3f4f6;
}

.view-toggle-btn.active {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

.backlog-task.overdue {
  background-color: #fef2f2;
  border-left: 3px solid #ef4444;
}

.overdue-badge {
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}
```

**Step 8: Test BacklogSidebar**

Run: `npm run dev`

Expected:
- Toggle between "All Pending" and "Unscheduled"
- "All Pending" shows ALL pending tasks
- "Unscheduled" shows only pending tasks without due date
- Overdue tasks show red indicator and "Overdue" badge
- Tasks sorted by priority (high → medium → low)
- Count updates correctly

**Step 9: Commit BacklogSidebar changes**

```bash
git add src/components/BacklogSidebar.jsx src/components/BacklogSidebar.css
git commit -m "feat: add all-pending view mode and overdue indicators to BacklogSidebar"
```

---

## Task 9: Testing and Verification

**Files:**
- Test: Manual testing of all features

**Step 1: Test status migration**

Open app, check existing tasks:
- All old "todo" tasks should show as "pending"
- All old "in-progress" tasks should show as "pending"
- All "completed" tasks remain "completed"

**Step 2: Test task creation flow**

1. Create new task
2. Default status should be "pending"
3. Only "Pending" and "Completed" in dropdown
4. Save task successfully

**Step 3: Test BacklogSidebar**

1. Create tasks with different statuses
2. Create tasks with/without due dates
3. Create overdue tasks (past due date)
4. Toggle between "All Pending" and "Unscheduled"
5. Verify count badges
6. Verify overdue indicators
7. Click task to edit

**Step 4: Test YearlyGoals**

1. Expand yearly goals panel
2. Type goals text
3. Wait 2 seconds, should see "Saving..."
4. Click outside textarea (blur)
5. Refresh page, goals should persist
6. Collapse panel, refresh, should stay collapsed

**Step 5: Test stats display**

1. Verify "Pending" shows correct count
2. Complete a task, verify counts update
3. Create new task, verify counts update

**Step 6: Run full build**

```bash
npm run build
```
Expected: No errors, successful build

**Step 7: Verify no console errors**

Open browser console:
Expected: No errors or warnings

---

## Task 10: Documentation and Cleanup

**Files:**
- Modify: `CLAUDE.md` (update documentation if needed)

**Step 1: Update CLAUDE.md if needed**

Review `CLAUDE.md` to see if any documentation needs updating:
- Status values section (update to pending/completed)
- Component list (add YearlyGoals)

**Step 2: Final commit**

```bash
git add .
git commit -m "docs: update CLAUDE.md with new status values and YearlyGoals component"
```

**Step 3: Create summary**

All features implemented:
✅ Task status simplified to pending/completed
✅ Database migrated existing tasks
✅ BacklogSidebar shows all pending tasks with toggle
✅ Overdue task indicators added
✅ Yearly goals panel created with auto-save
✅ Stats display updated

---

## Rollback Plan

If issues arise:

1. **Database rollback:**
```sql
-- No easy rollback for status migration
-- Would need to restore from backup
```

2. **Code rollback:**
```bash
git revert <commit-hash>
```

3. **Feature flags:** Consider adding localStorage flag to toggle between old/new behavior if needed

---

## Future Enhancements

- Add task completion percentage to yearly goals
- Link tasks to specific yearly goals
- Archive old yearly goals
- Add quarterly goal breakdowns
- Export yearly goals as PDF
