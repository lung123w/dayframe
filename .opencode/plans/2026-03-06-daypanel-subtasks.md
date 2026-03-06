# DayPanel Subtasks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show interactive subtask checklists in the DayPanel sidebar so users can view and toggle subtask completion without opening the TaskModal.

**Architecture:** Pass `subtasks` array and `onSubtaskToggle` callback from App.jsx to DayPanel. DayPanel groups subtasks by `parentTaskId` via `useMemo`, renders a compact checklist under each task row, and calls the toggle callback on checkbox click.

**Tech Stack:** React, existing Dexie subtaskService, vanilla CSS.

---

### Task 0: Create feature branch

**Step 1: Create and switch to branch**

```bash
git checkout -b feature/daypanel-subtasks
```

**Step 2: Verify branch**

```bash
git branch --show-current
```

Expected: `feature/daypanel-subtasks`

---

### Task 1: Wire subtasks and toggle callback to DayPanel in App.jsx

**Files:**
- Modify: `src/App.jsx:451-460` (DayPanel props)

**Step 1: Add `onSubtaskToggle` handler**

In `src/App.jsx`, after the existing `handleSubtaskChange` function (around line 194-196), add a new handler:

```jsx
// Toggle a subtask's completed state directly from DayPanel
const handleSubtaskToggle = async (subtaskId) => {
  try {
    await subtaskService.toggleCompleted(subtaskId);
    await loadData();
  } catch (err) {
    console.error('Failed to toggle subtask:', err);
  }
};
```

**Step 2: Pass props to DayPanel**

In the DayPanel JSX (around line 451-460), add the two new props:

```jsx
<DayPanel
  date={selectedDayDate}
  tasks={tasks}
  projects={projects}
  teamMembers={teamMembers}
  subtasks={subtasks}
  onSubtaskToggle={handleSubtaskToggle}
  onTaskClick={handleTaskClick}
  onStatusUpdate={handleStatusUpdate}
  onNewTask={handleNewTaskForDay}
  onDeleteTask={handleDeleteTask}
/>
```

**Step 3: Verify app still compiles**

```bash
npm run dev
```

Expected: No errors (DayPanel will just ignore the new props for now).

**Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire subtasks and onSubtaskToggle props to DayPanel"
```

---

### Task 2: Add subtask checklist rendering in DayPanel

**Files:**
- Modify: `src/components/DayPanel.jsx`

**Step 1: Update component signature and add subtask grouping**

Update the function signature to accept `subtasks` and `onSubtaskToggle`:

```jsx
export default function DayPanel({ date, tasks, projects, teamMembers, subtasks, onSubtaskToggle, onTaskClick, onStatusUpdate, onNewTask, onDeleteTask }) {
```

Add a `useMemo` after the `dayTasks` memo (around line 76) to group subtasks by task ID:

```jsx
const subtasksByTaskId = useMemo(() => {
  const map = {};
  (subtasks || []).forEach(st => {
    if (!map[st.parentTaskId]) map[st.parentTaskId] = [];
    map[st.parentTaskId].push(st);
  });
  // Sort each group by sortOrder
  Object.values(map).forEach(arr => arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
  return map;
}, [subtasks]);
```

**Step 2: Render subtask checklist in `renderTask()`**

Inside `renderTask()`, after the description block (after line 118, `)}`) and before the meta `<div>` (line 120), insert the subtask checklist:

```jsx
{/* Subtask checklist */}
{(() => {
  const taskSubtasks = subtasksByTaskId[task.isRecurringInstance ? (task.recurringSourceId || task.id) : task.id];
  if (!taskSubtasks || taskSubtasks.length === 0) return null;
  const completedCount = taskSubtasks.filter(st => st.completed).length;
  return (
    <div className="day-subtask-section">
      <span className="day-subtask-summary">[{completedCount}/{taskSubtasks.length}]</span>
      <ul className="day-subtask-list">
        {taskSubtasks.map(st => (
          <li key={st.id} className={`day-subtask-item${st.completed ? ' day-subtask-item--done' : ''}`}>
            <input
              type="checkbox"
              className="day-subtask-checkbox"
              checked={st.completed}
              onChange={() => onSubtaskToggle(st.id)}
            />
            <span className="day-subtask-title">{st.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
})()}
```

**Step 3: Verify it renders**

```bash
npm run dev
```

Open browser, select a day with tasks that have subtasks. Confirm the checklist appears.

**Step 4: Commit**

```bash
git add src/components/DayPanel.jsx
git commit -m "feat: render interactive subtask checklist in DayPanel"
```

---

### Task 3: Add subtask checklist styles in DayPanel.css

**Files:**
- Modify: `src/components/DayPanel.css` (append at end)

**Step 1: Add the CSS**

Append to `src/components/DayPanel.css`:

```css
/* ── Subtask checklist in task rows ── */

.day-subtask-section {
  margin-top: 4px;
  margin-left: 2px;
}

.day-subtask-summary {
  font-size: 10px;
  font-weight: 700;
  color: #94A3B8;
  letter-spacing: 0.3px;
}

.day-subtask-list {
  list-style: none;
  margin: 2px 0 0 0;
  padding: 0;
}

.day-subtask-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1px 0;
}

.day-subtask-checkbox {
  width: 13px;
  height: 13px;
  cursor: pointer;
  accent-color: #16A34A;
  flex-shrink: 0;
}

.day-subtask-title {
  font-size: 11px;
  color: #475569;
  line-height: 1.3;
}

.day-subtask-item--done .day-subtask-title {
  text-decoration: line-through;
  color: #CBD5E1;
}
```

**Step 2: Verify styling in browser**

```bash
npm run dev
```

Confirm subtasks appear as a compact, indented checklist. Completed subtasks should have strikethrough text in muted color.

**Step 3: Commit**

```bash
git add src/components/DayPanel.css
git commit -m "style: add subtask checklist styles for DayPanel"
```

---

### Task 4: Run tests and verify

**Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: All 50 tests pass. The 2 CodeNomad failures are unrelated and pre-existing.

**Step 2: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Commit if any fixes were needed, otherwise done**

---
