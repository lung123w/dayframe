# Vertical Sidebar + Horizontal Scrolling + Time Blocks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign DayFrame layout with vertical sidebar navigation, horizontal scrolling week view, and time-based task scheduling.

**Architecture:** Progressive enhancement approach - add Sidebar component, wrap day columns in horizontal scroll container, add scheduledTime field to tasks database, enhance DayColumn and TaskModal to display/edit scheduled times.

**Tech Stack:** React 19.2, better-sqlite3 (database), date-fns (time formatting), existing DayFrame components

---

## Task 1: Database Migration - Add scheduledTime Column

**Files:**
- Modify: `server/db.js:139-150` (after existing migrations)

**Step 1: Add scheduledTime column migration**

Add after line 149 in `server/db.js`:

```javascript
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN scheduledTime TEXT DEFAULT NULL`);
} catch (e) {
  // Column already exists — ignore
}
```

**Step 2: Verify migration**

Run: `npm run dev`
Expected: Server starts without errors, migration runs silently

**Step 3: Test database schema**

Check `data/app.db` has new column:
```bash
sqlite3 data/app.db "PRAGMA table_info(tasks);"
```
Expected: See `scheduledTime | TEXT | 0 | NULL | 0` in output

**Step 4: Commit**

```bash
git add server/db.js
git commit -m "feat(db): add scheduledTime column to tasks table"
```

---

## Task 2: Create Sidebar Component

**Files:**
- Create: `src/components/Sidebar.jsx`
- Create: `src/components/Sidebar.css`

**Step 1: Create Sidebar.jsx component**

```javascript
import React from 'react';
import { FaCalendar, FaLink, FaFolder, FaBell, FaDownload } from 'react-icons/fa';
import './Sidebar.css';

export default function Sidebar({ activeView, onViewChange, onNotifications, onBackup }) {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <FaCalendar className="sidebar-brand-icon" />
        <h1>DayFrame</h1>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-header">VIEWS</div>
          <button
            className={`sidebar-nav-item ${activeView === 'planner' ? 'active' : ''}`}
            onClick={() => onViewChange('planner')}
          >
            <FaCalendar />
            <span>Planner</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeView === 'habits' ? 'active' : ''}`}
            onClick={() => onViewChange('habits')}
          >
            <FaLink />
            <span>Habits</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeView === 'projects' ? 'active' : ''}`}
            onClick={() => onViewChange('projects')}
          >
            <FaFolder />
            <span>Projects</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">TOOLS</div>
          <button className="sidebar-nav-item" onClick={onNotifications}>
            <FaBell />
            <span>Notifications</span>
          </button>
          <button className="sidebar-nav-item" onClick={onBackup}>
            <FaDownload />
            <span>Backup</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
```

**Step 2: Create Sidebar.css**

```css
.sidebar {
  width: 220px;
  background: #1E293B;
  color: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  border-right: 1px solid #0F172A;
}

.sidebar-brand {
  padding: 20px 20px 16px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-brand-icon {
  font-size: 20px;
  color: #F97316;
}

.sidebar-brand h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.4px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-section-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.4);
  padding: 8px 12px 4px 12px;
  text-transform: uppercase;
}

.sidebar-nav-item {
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  border: none;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: 'Plus Jakarta Sans', sans-serif;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.15s ease, color 0.15s ease;
  text-align: left;
}

.sidebar-nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.sidebar-nav-item.active {
  background: rgba(249, 115, 22, 0.15);
  color: #F97316;
  font-weight: 600;
}

.sidebar-nav-item svg {
  font-size: 16px;
  flex-shrink: 0;
}

.sidebar-nav-item span {
  flex: 1;
}
```

**Step 3: Test Sidebar in isolation**

Create temporary test in `App.jsx` (will remove later):
```javascript
import Sidebar from './components/Sidebar';
// ... in App return, temporarily add:
<Sidebar 
  activeView="planner" 
  onViewChange={(v) => console.log('View:', v)}
  onNotifications={() => console.log('Notifications')}
  onBackup={() => console.log('Backup')}
/>
```

Run: `npm run dev`
Expected: Sidebar appears, clicking items logs to console

**Step 4: Commit**

```bash
git add src/components/Sidebar.jsx src/components/Sidebar.css
git commit -m "feat(ui): add Sidebar component with grouped navigation"
```

---

## Task 3: Integrate Sidebar into App Layout

**Files:**
- Modify: `src/App.jsx:1-50, 252-285`
- Modify: `src/App.css:27-47`

**Step 1: Import Sidebar in App.jsx**

Add to imports (line 2):
```javascript
import Sidebar from './components/Sidebar';
```

**Step 2: Update App layout structure**

Replace the `<header>` section (lines 254-285) with Sidebar:

```javascript
return (
  <div className="app">
    <Sidebar
      activeView={activeView}
      onViewChange={setActiveView}
      onNotifications={requestNotificationPermission}
      onBackup={handleBackup}
    />

    <main className="app-main">
      {activeView === 'planner' && (
        <>
          {/* ── Toolbar ── */}
          <div className="toolbar">
            {/* ... existing toolbar code ... */}
          </div>

          <DailyPlanner
            {/* ... existing props ... */}
          />
        </>
      )}

      {activeView === 'habits' && (
        <HabitTracker />
      )}

      {activeView === 'projects' && (
        <ProjectsView
          projects={projects}
          onCreateProject={() => handleOpenProjectModal()}
          onEditProject={(project) => handleOpenProjectModal(project)}
          onDeleteProject={handleDeleteProject}
        />
      )}
    </main>

    {/* Modals remain the same */}
    {showTaskModal && (
      <TaskModal
        {/* ... existing props ... */}
      />
    )}

    {showProjectModal && (
      <ProjectModal
        {/* ... existing props ... */}
      />
    )}
  </div>
);
```

**Step 3: Update App.css layout**

Replace `.app` styles (lines 28-32):
```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: row; /* Changed from column */
}
```

Remove header styles (lines 35-127 can be deleted - no longer needed)

Update `.app-main` (lines 129-136):
```css
.app-main {
  flex: 1;
  padding: 28px 32px;
  width: 100%;
  background-color: #F8FAFC;
  overflow-x: auto; /* Allow horizontal scrolling */
}
```

**Step 4: Test layout**

Run: `npm run dev`
Expected:
- Sidebar visible on left with DayFrame branding
- Main content on right
- Clicking Planner/Habits/Projects switches views
- Notifications and Backup buttons work

**Step 5: Commit**

```bash
git add src/App.jsx src/App.css
git commit -m "feat(layout): integrate Sidebar with horizontal app layout"
```

---

## Task 4: Add Horizontal Scrolling to Week View

**Files:**
- Modify: `src/components/DailyPlanner.jsx:40-82`
- Modify: `src/components/DailyPlanner.css:1-75`

**Step 1: Update DailyPlanner to render 3 weeks**

Modify the weekDays calculation (around line 45):

```javascript
// Generate 3 weeks of dates: previous week, current week, next week
const weekDays = useMemo(() => {
  const prevWeekStart = addDays(weekStartDate, -7);
  const allDays = [];
  
  // Previous week (7 days)
  for (let i = 0; i < 7; i++) {
    allDays.push(format(addDays(prevWeekStart, i), 'yyyy-MM-dd'));
  }
  
  // Current week (7 days)
  for (let i = 0; i < 7; i++) {
    allDays.push(format(addDays(weekStartDate, i), 'yyyy-MM-dd'));
  }
  
  // Next week (7 days)
  for (let i = 0; i < 7; i++) {
    allDays.push(format(addDays(weekStartDate, 7 + i), 'yyyy-MM-dd'));
  }
  
  return allDays; // 21 days total
}, [weekStartDate]);
```

**Step 2: Update activeDate logic**

Update to use current week range only (lines 49-50):

```javascript
const currentWeekDays = weekDays.slice(7, 14); // Just the middle week
const activeDate = currentWeekDays.includes(selectedDate) ? selectedDate : currentWeekDays[0];
```

**Step 3: Add horizontal scroll container**

Find the day columns rendering section and wrap it:

```javascript
<div className="dp-week-scroll-wrapper">
  <div className="dp-columns">
    {weekDays.map((dateStr, index) => {
      const isExpanded = dateStr === activeDate;
      return (
        <DayColumn
          key={dateStr}
          dateStr={dateStr}
          tasks={tasks}
          projects={projects}
          subtasks={subtasks}
          expanded={isExpanded}
          onTaskClick={onTaskClick}
          onStatusUpdate={onStatusUpdate}
          onNewTask={() => onNewTask(dateStr)}
          onDeleteTask={onDeleteTask}
          onSubtaskToggle={onSubtaskToggle}
          onEstimateChange={handleEstimateChange}
          onDragOver={handleTaskDragOver}
          onDrop={(e) => handleDrop(e, index)}
        />
      );
    })}
  </div>
</div>
```

**Step 4: Add CSS for horizontal scrolling**

In `DailyPlanner.css`, add before `.dp-columns`:

```css
.dp-week-scroll-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  scroll-behavior: smooth;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

/* Hide scrollbar but keep functionality */
.dp-week-scroll-wrapper::-webkit-scrollbar {
  height: 6px;
}

.dp-week-scroll-wrapper::-webkit-scrollbar-track {
  background: #E2E8F0;
  border-radius: 3px;
}

.dp-week-scroll-wrapper::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}

.dp-week-scroll-wrapper::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}
```

Update `.dp-columns` to handle 21 columns:

```css
.dp-columns {
  display: grid;
  grid-template-columns: repeat(21, minmax(200px, 1fr)); /* Changed from 7 to 21 */
  gap: 8px;
  align-items: flex-start;
  width: max-content;
  min-width: 100%;
}
```

**Step 5: Test horizontal scrolling**

Run: `npm run dev`
Expected:
- 7 days visible in viewport
- Scroll right → see next week's columns
- Scroll left → see previous week's columns
- Smooth scrolling behavior
- Current week starts in view

**Step 6: Commit**

```bash
git add src/components/DailyPlanner.jsx src/components/DailyPlanner.css
git commit -m "feat(planner): add horizontal scrolling for multi-week view"
```

---

## Task 5: Add Time Picker to TaskModal

**Files:**
- Modify: `src/components/TaskModal.jsx:14-50, 100-150`
- Modify: `src/components/TaskModal.css:1-50`

**Step 1: Add scheduledTime to form state**

Find the initial state setup (around line 14) and add:

```javascript
const [formData, setFormData] = useState({
  title: task?.title || '',
  description: task?.description || '',
  descriptionImages: task?.descriptionImages || [],
  dueDate: task?.dueDate || selectedDate || '',
  scheduledTime: task?.scheduledTime || '', // Add this line
  priority: task?.priority || 'medium',
  status: task?.status || 'pending',
  projectId: task?.projectId || null,
  assignedTo: task?.assignedTo || [],
  isRecurring: task?.isRecurring || false,
  recurrencePattern: task?.recurrencePattern || null,
  estimatedMinutes: task?.estimatedMinutes || null,
});
```

**Step 2: Add time input field in JSX**

Find the due date input section and add time picker below it:

```javascript
{/* Due Date */}
<div className="tm-form-group">
  <label htmlFor="dueDate">Due Date</label>
  <input
    type="date"
    id="dueDate"
    value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
  />
</div>

{/* Scheduled Time - NEW */}
<div className="tm-form-group">
  <label htmlFor="scheduledTime">
    Scheduled Time
    <span className="tm-label-hint">(optional)</span>
  </label>
  <div className="tm-time-input-wrapper">
    <input
      type="time"
      id="scheduledTime"
      value={formData.scheduledTime || ''}
      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
    />
    {formData.scheduledTime && (
      <button
        type="button"
        className="tm-clear-time"
        onClick={() => setFormData({ ...formData, scheduledTime: '' })}
        title="Clear time"
      >
        ×
      </button>
    )}
  </div>
</div>
```

**Step 3: Add CSS for time input**

Add to `TaskModal.css`:

```css
.tm-label-hint {
  font-size: 12px;
  font-weight: 400;
  color: #64748B;
  margin-left: 6px;
}

.tm-time-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.tm-time-input-wrapper input[type="time"] {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: border-color 0.15s ease;
}

.tm-time-input-wrapper input[type="time"]:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.tm-clear-time {
  position: absolute;
  right: 8px;
  background: #E2E8F0;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  color: #64748B;
  transition: background 0.15s ease;
}

.tm-clear-time:hover {
  background: #CBD5E1;
  color: #1E293B;
}
```

**Step 4: Ensure scheduledTime is saved**

Check that the save handler includes scheduledTime (should work automatically if formData is spread correctly).

**Step 5: Test time picker**

Run: `npm run dev`
Expected:
- Open/create task
- See "Scheduled Time (optional)" field below due date
- Select time using picker
- Clear time with × button
- Save task → scheduledTime stored in database

**Step 6: Commit**

```bash
git add src/components/TaskModal.jsx src/components/TaskModal.css
git commit -m "feat(task): add scheduled time picker to task modal"
```

---

## Task 6: Display Scheduled Time in DayColumn

**Files:**
- Modify: `src/components/DayColumn.jsx:88-94, 143-200`
- Modify: `src/components/DayColumn.css:200-250`

**Step 1: Update task sorting to prioritize scheduledTime**

Find the task sorting logic (around line 88) and update:

```javascript
return result.sort((a, b) => {
  // Sort by scheduled time first (if both have it)
  const aTime = a.scheduledTime || '';
  const bTime = b.scheduledTime || '';
  
  if (aTime && bTime) {
    if (aTime !== bTime) return aTime.localeCompare(bTime);
  } else if (aTime) {
    return -1; // Tasks with time come before tasks without
  } else if (bTime) {
    return 1;
  }
  
  // Then by sortOrder
  const orderA = a.sortOrder ?? 0;
  const orderB = b.sortOrder ?? 0;
  if (orderA !== orderB) return orderA - orderB;
  
  // Finally by priority
  return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
});
```

**Step 2: Add time badge to task card rendering**

Find the task card rendering section (around line 150-200) and add time badge:

```javascript
const renderTask = (task) => {
  const project = getProject(task.projectId);
  const isCompleted = task.status === 'completed';
  const subtaskTaskId = task.isRecurringInstance ? (task.recurringSourceId || task.id) : task.id;
  const taskSubtasks = subtasksByTaskId[subtaskTaskId] || [];
  const completedSubtasks = taskSubtasks.filter(st => st.completed).length;
  const taskKey = task.isRecurringInstance ? `${task.id}-${task.instanceDate}` : task.id;
  const isEditingEst = editingEstimate === taskKey;

  // Format scheduled time for display
  const timeDisplay = task.scheduledTime ? formatTimeDisplay(task.scheduledTime) : null;

  return (
    <div
      key={taskKey}
      className={`dc-task ${isCompleted ? 'dc-task--completed' : ''}`}
      draggable
      onDragStart={(e) => handleTaskDragStart(e, task)}
      onDragOver={(e) => handleTaskDragOver(e, dayTasks.indexOf(task))}
    >
      <div className="dc-task-header">
        {/* Time badge - NEW */}
        {timeDisplay && (
          <div className="dc-task-time">{timeDisplay}</div>
        )}
        
        {/* Existing task content */}
        <div className="dc-task-title-row">
          {/* ... existing status icon, title, etc. ... */}
        </div>
      </div>
      {/* ... rest of task card ... */}
    </div>
  );
};
```

**Step 3: Add CSS for time badge**

Add to `DayColumn.css`:

```css
.dc-task-time {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
  background: #F1F5F9;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.dc-task--completed .dc-task-time {
  color: #94A3B8;
  background: #F8FAFC;
}
```

**Step 4: Test time display**

Run: `npm run dev`
Expected:
- Tasks with scheduled time show time badge (e.g., "7:30p")
- Tasks are sorted chronologically by time
- Tasks without time appear at bottom
- Time badge visible on both mini and expanded columns

**Step 5: Commit**

```bash
git add src/components/DayColumn.jsx src/components/DayColumn.css
git commit -m "feat(task): display scheduled time badges and sort chronologically"
```

---

## Task 7: Responsive Design Adjustments

**Files:**
- Modify: `src/components/Sidebar.css:1-100`
- Modify: `src/App.css:400-436`

**Step 1: Add mobile sidebar styles**

Add to bottom of `Sidebar.css`:

```css
@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  .sidebar-brand h1 {
    display: none;
  }

  .sidebar-nav-item span {
    display: none;
  }

  .sidebar-section-header {
    display: none;
  }

  .sidebar-nav-item {
    justify-content: center;
    padding: 12px;
  }
}
```

**Step 2: Update responsive styles in App.css**

Update mobile styles (around line 400):

```css
@media (max-width: 768px) {
  .app-main {
    padding: 16px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }
}
```

**Step 3: Test responsive behavior**

Run: `npm run dev`
Open browser dev tools, test different viewport sizes:
- Desktop (>1200px): Full sidebar with labels
- Tablet (768-1200px): Full sidebar
- Mobile (<768px): Collapsed sidebar (icons only)

**Step 4: Commit**

```bash
git add src/components/Sidebar.css src/App.css
git commit -m "feat(ui): add responsive styles for sidebar and mobile"
```

---

## Task 8: Polish and Testing

**Files:**
- Test: Manual testing of all features
- Modify: Any bug fixes discovered

**Step 1: Test sidebar navigation**

Manual test checklist:
- [ ] Click Planner → shows planner view, highlights Planner in sidebar
- [ ] Click Habits → shows habits view, highlights Habits in sidebar
- [ ] Click Projects → shows projects view, highlights Projects in sidebar
- [ ] Click Notifications → requests browser permission
- [ ] Click Backup → downloads JSON file
- [ ] Active view persists when creating/editing tasks

**Step 2: Test horizontal scrolling**

Manual test checklist:
- [ ] Planner loads with current week visible
- [ ] Scroll right → see next week (7 more days)
- [ ] Scroll left → see previous week (7 days before current)
- [ ] Prev/Next week buttons work (if kept)
- [ ] Expanded day stays expanded when scrolling
- [ ] Tasks render correctly in all weeks

**Step 3: Test scheduled time**

Manual test checklist:
- [ ] Create task with scheduled time → time badge appears
- [ ] Create task without scheduled time → no badge
- [ ] Edit task to add time → badge appears
- [ ] Edit task to remove time (× button) → badge disappears
- [ ] Tasks sort chronologically by time
- [ ] Tasks without time appear at bottom of day
- [ ] Time displays in 12-hour format (7:30p, 9a)
- [ ] Recurring tasks with scheduled time show time on all instances

**Step 4: Test edge cases**

- [ ] Multiple tasks with same scheduled time → stable sort by priority
- [ ] Task with time but no due date → doesn't appear in day columns
- [ ] Very long task title with time badge → no overflow issues
- [ ] Mobile responsive → sidebar collapses, scrolling works on touch

**Step 5: Fix any bugs discovered**

If bugs found:
1. Fix the bug
2. Test the fix
3. Commit with descriptive message: `fix(component): description of fix`

**Step 6: Final commit**

```bash
git add .
git commit -m "test: verify all features working correctly"
```

---

## Task 9: Documentation Update

**Files:**
- Modify: `CLAUDE.md:1-50`

**Step 1: Update CLAUDE.md with new features**

Add to the "Feature Implementation" section (around line 50):

```markdown
### Vertical Sidebar Navigation
- Grouped sections (Views, Tools) in `Sidebar.jsx`
- Active view highlighting with orange accent
- Responsive: Collapses to icon-only on mobile (<768px)

### Horizontal Scrolling Week View
- Renders 3 weeks (21 days) in scrollable container
- Current week centered on load
- Smooth scrolling with visible scrollbar
- Implementation in `DailyPlanner.jsx` with `.dp-week-scroll-wrapper`

### Scheduled Time for Tasks
- Optional `scheduledTime` field (HH:MM format in database)
- Time picker in TaskModal (HTML5 time input)
- Tasks sort chronologically by scheduled time
- Time badge display in DayColumn (12-hour format)
- Tasks without time appear at bottom of day
```

**Step 2: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: document vertical sidebar, horizontal scrolling, and time blocks"
```

---

## Task 10: Create Feature Branch and Final Review

**Files:**
- Git: Branch and commit management

**Step 1: Check git status**

```bash
git status
git log --oneline -10
```

Expected: See all 9+ commits for this feature

**Step 2: Test entire app end-to-end**

Run: `npm run dev`

Test complete workflow:
1. App loads with sidebar on left
2. Navigate between views using sidebar
3. Create task with scheduled time (e.g., "Job Search" at 7:30pm)
4. Verify time badge appears, task sorts correctly
5. Scroll horizontally to see next/previous weeks
6. Edit task to change time
7. Test on mobile viewport

**Step 3: Run linter**

```bash
npm run lint
```

Expected: No errors (fix any that appear)

**Step 4: Create summary commit** (if needed)

If you made any final tweaks, commit them:
```bash
git add .
git commit -m "chore: final polish and testing"
```

**Step 5: Review complete implementation**

Verify all components working:
- ✅ Sidebar with grouped navigation
- ✅ Horizontal scrolling multi-week view
- ✅ Scheduled time picker in TaskModal
- ✅ Time badges on tasks
- ✅ Chronological sorting by time
- ✅ Responsive design
- ✅ Documentation updated

---

## Success Criteria

**Implementation is complete when:**

1. ✅ Sidebar renders with VIEWS and TOOLS sections
2. ✅ Clicking sidebar items switches between Planner/Habits/Projects
3. ✅ Planner shows 7 days with horizontal scroll to see more weeks
4. ✅ Tasks can have optional scheduled time via time picker
5. ✅ Tasks with scheduled time display time badge (12-hour format)
6. ✅ Tasks sort chronologically by scheduled time within each day
7. ✅ All existing features still work (recurring tasks, drag-drop, subtasks)
8. ✅ Responsive design works on mobile/tablet
9. ✅ No console errors or warnings
10. ✅ Documentation updated in CLAUDE.md

**Estimated total time:** 4-6 hours

**Commit count:** ~10 commits (one per task)

---

## Notes for Implementation

**Database:**
- scheduledTime stored as TEXT in "HH:MM" 24-hour format
- Nullable field (backward compatible with existing tasks)

**Time Format:**
- Store: 24-hour ("19:30", "09:00")
- Display: 12-hour ("7:30p", "9a")
- Use existing `formatTimeDisplay` pattern from DayColumn.jsx

**Horizontal Scrolling:**
- Renders 21 columns (3 weeks × 7 days)
- Each column ~200px min-width
- Total width: ~4200px (requires horizontal scroll on most screens)
- Current week (middle 7 days) centered in view on load

**Sidebar:**
- Fixed width 220px on desktop
- Collapses to 60px (icons only) on mobile
- Dark background matches old header (#1E293B)
- Orange accent for active items (#F97316)

**Testing:**
- No automated tests in this plan (existing app has minimal test coverage)
- Rely on manual testing and linting
- Future: Add Vitest tests for Sidebar, time sorting logic

**Potential Issues:**
- Performance with 21 columns if user has hundreds of tasks (can optimize later with virtualization)
- Time picker UX varies by browser (Chrome/Firefox/Safari render differently)
- Horizontal scroll might not be intuitive for all users (consider adding arrow navigation hints)
