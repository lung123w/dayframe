# Design: Subtasks on New Task Creation

**Date**: 2026-03-06
**Feature**: Allow users to add subtasks while creating a new task (before the parent task is saved to IndexedDB)

## Problem

Currently, when creating a new task (`task` is `null`), the TaskModal shows "Save the task first to add subtasks." This is because subtasks are stored in a separate Dexie table (`subtasks`) with a `parentTaskId` foreign key — an ID that doesn't exist until the parent task is persisted.

This forces a two-step workflow: create task → reopen task → add subtasks. Users should be able to add subtasks inline during initial task creation.

## Approach: Buffer Locally

Collect subtask titles in local component state during task creation. On form submit, pass the pending subtasks alongside the task data. The save handler creates the parent task first (getting its ID), then bulk-creates all pending subtasks.

### Why this approach
- **Simplest implementation** — no schema changes, no temporary IDs, no auto-save side effects
- **Identical UX** — the subtask UI looks and behaves the same in create vs edit mode
- **Atomic save** — nothing is persisted until the user explicitly clicks "Create Task"
- **Minimal blast radius** — only `TaskModal.jsx` and `App.jsx` need changes

## Detailed Design

### 1. TaskModal.jsx — New Local State

Add a `pendingSubtasks` state array, used ONLY in create mode (`!task?.id`):

```js
const [pendingSubtasks, setPendingSubtasks] = useState([]);
```

Each entry: `{ tempId: crypto.randomUUID(), title: string, completed: false }`

The `tempId` is for React keys only — never persisted.

### 2. TaskModal.jsx — Unified Subtask UI

Replace the `!task?.id` guard (line 340-341) with a branch:

- **Create mode** (`!task?.id`): render subtask list from `pendingSubtasks`, with add/remove/edit operating on local state only (no DB calls)
- **Edit mode** (`task?.id`): existing behavior unchanged (DB-backed subtasks via `localSubtasks`)

The subtask add/remove/edit functions for create mode are pure state operations:

```js
const addPendingSubtask = () => {
  const title = newSubtaskTitle.trim();
  if (!title) return;
  setPendingSubtasks(prev => [...prev, {
    tempId: crypto.randomUUID(),
    title,
    completed: false,
    sortOrder: prev.length,
  }]);
  setNewSubtaskTitle('');
};

const removePendingSubtask = (tempId) => {
  setPendingSubtasks(prev => prev.filter(s => s.tempId !== tempId));
};

const editPendingSubtask = (tempId, newTitle) => {
  setPendingSubtasks(prev => prev.map(s =>
    s.tempId === tempId ? { ...s, title: newTitle } : s
  ));
};
```

### 3. TaskModal.jsx — handleSubmit Change

When submitting in create mode, include `pendingSubtasks` in the `onSave` call:

```js
const handleSubmit = (e) => {
  e.preventDefault();
  const taskData = { ...formData, /* existing transforms */ };
  
  // Attach pending subtasks for new tasks
  if (!task?.id && pendingSubtasks.length > 0) {
    taskData._pendingSubtasks = pendingSubtasks.map(({ title, completed, sortOrder }) => ({
      title, completed, sortOrder
    }));
  }
  
  onSave(taskData);
};
```

The `_pendingSubtasks` field is a transient property — stripped before persisting the task itself.

### 4. App.jsx — handleSaveTask Change

Update `handleSaveTask` to handle the `_pendingSubtasks` array:

```js
const handleSaveTask = async (taskData) => {
  try {
    const pendingSubtasks = taskData._pendingSubtasks || [];
    delete taskData._pendingSubtasks;

    if (selectedTask) {
      await taskService.update(selectedTask.id, taskData);
    } else {
      const newTask = await taskService.create(taskData);
      // Bulk-create pending subtasks with the real parent ID
      for (const sub of pendingSubtasks) {
        await subtaskService.create({ parentTaskId: newTask.id, ...sub });
      }
    }
    await loadData();
    setShowTaskModal(false);
    setSelectedTask(null);
    setSelectedDate(null);
  } catch (err) {
    console.error('Failed to save task:', err);
  }
};
```

### 5. Subtask Count Display

The progress count label (`(completed/total)`) already works from `localSubtasks`. In create mode, it will derive from `pendingSubtasks` instead:

```js
const displaySubtasks = task?.id ? localSubtasks : pendingSubtasks;
```

This `displaySubtasks` variable is used for both the count display and list rendering.

## What Doesn't Change

- **Dexie schema** — no changes to tables or models
- **subtaskService** — no new methods needed
- **Edit mode behavior** — completely unchanged
- **Calendar/DayPanel** — unchanged (they read from DB after save)
- **CSS** — existing subtask styles work for both modes

## Test Changes

### TaskModal.test.jsx
- **Update**: Test `'shows "save first" message for new tasks'` → change to verify subtask add input IS shown for new tasks
- **Add**: Test that pending subtasks appear in the list during create mode
- **Add**: Test that `onSave` receives `_pendingSubtasks` when subtasks were added during creation

### App.test.jsx
- **Add**: Test that `handleSaveTask` creates subtasks after creating the parent task when `_pendingSubtasks` is present

## Edge Cases

1. **Empty pending subtasks** — no `_pendingSubtasks` key attached, save works as before
2. **Duplicate subtask titles** — allowed (same as edit mode)
3. **Whitespace-only titles** — trimmed and rejected by existing `.trim()` check
4. **Modal closed without saving** — pending subtasks discarded with component unmount (no cleanup needed)
