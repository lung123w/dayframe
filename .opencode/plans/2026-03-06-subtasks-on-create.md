# Implementation Plan: Subtasks on New Task Creation

**Design doc**: `.opencode/plans/2026-03-06-subtasks-on-create-design.md`
**Branch**: `feature/subtasks-on-create`

## Tasks

All tasks can be executed by a single subagent sequentially (they touch overlapping files).

---

### Task 1: Update TaskModal.jsx — Add pending subtask state and local operations

**File**: `src/components/TaskModal.jsx`

**Changes**:

1. **Add `pendingSubtasks` state** (after line 36):
   ```js
   const [pendingSubtasks, setPendingSubtasks] = useState([]);
   ```

2. **Add create-mode subtask functions** (after `saveEditSubtask`, ~line 89):
   ```js
   // ── Pending subtask operations (create mode only) ──
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

   const startEditPendingSubtask = (subtask) => {
     setEditingSubtaskId(subtask.tempId);
     setEditingSubtaskTitle(subtask.title);
   };

   const saveEditPendingSubtask = () => {
     const title = editingSubtaskTitle.trim();
     if (!title || !editingSubtaskId) {
       setEditingSubtaskId(null);
       return;
     }
     setPendingSubtasks(prev => prev.map(s =>
       s.tempId === editingSubtaskId ? { ...s, title } : s
     ));
     setEditingSubtaskId(null);
     setEditingSubtaskTitle('');
   };

   const togglePendingSubtask = (tempId) => {
     setPendingSubtasks(prev => prev.map(s =>
       s.tempId === tempId ? { ...s, completed: !s.completed } : s
     ));
   };
   ```

3. **Update `handleSubmit`** (line 229-245) — attach `_pendingSubtasks` to taskData:

   After building `taskData`, before calling `onSave(taskData)`:
   ```js
   if (!task?.id && pendingSubtasks.length > 0) {
     taskData._pendingSubtasks = pendingSubtasks.map(({ title, completed, sortOrder }) => ({
       title, completed, sortOrder
     }));
   }
   ```

4. **Replace the `!task?.id` guard in JSX** (lines 340-408):

   Add a computed variable before the return:
   ```js
   const isCreateMode = !task?.id;
   const displaySubtasks = isCreateMode ? pendingSubtasks : localSubtasks;
   ```

   Replace lines 340-408 with unified subtask rendering that branches on `isCreateMode` for event handlers:
   - In create mode: use `addPendingSubtask`, `removePendingSubtask`, `togglePendingSubtask`, `startEditPendingSubtask`, `saveEditPendingSubtask`
   - In edit mode: use existing `addSubtask`, `deleteSubtask`, `toggleSubtask`, `startEditSubtask`, `saveEditSubtask`
   - The subtask list renders from `displaySubtasks`
   - Use `st.tempId || st.id` as the React key
   - The progress count uses `displaySubtasks`
   - Remove the "Save the task first to add subtasks" message entirely

**Verification**: `npm run test:run` — existing tests will initially fail (the "save first" test needs updating in Task 3)

---

### Task 2: Update App.jsx — Handle `_pendingSubtasks` in `handleSaveTask`

**File**: `src/App.jsx`

**Changes**:

Update `handleSaveTask` (lines 117-131):

```js
const handleSaveTask = async (taskData) => {
  try {
    const pendingSubtasks = taskData._pendingSubtasks || [];
    delete taskData._pendingSubtasks;

    if (selectedTask) {
      await taskService.update(selectedTask.id, taskData);
    } else {
      const newTask = await taskService.create(taskData);
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

Key change: capture `_pendingSubtasks`, strip it from `taskData`, then after `taskService.create()` returns the new task (with `.id`), loop through and create each subtask.

**Verification**: `npm run test:run`

---

### Task 3: Update Tests

**File**: `src/__tests__/TaskModal.test.jsx`

**Changes**:

1. **Replace test "shows 'save first' message for new tasks"** (lines 168-181):
   Change to verify that the subtask add input IS shown for new tasks:
   ```js
   it('shows subtask add input for new tasks (create mode)', () => {
     render(
       <TaskModal
         task={null}
         projects={mockProjects}
         teamMembers={mockTeamMembers}
         onSave={mockOnSave}
         onClose={mockOnClose}
         onSubtaskChange={mockOnSubtaskChange}
       />
     );

     // Should show add subtask input even for new tasks
     expect(screen.getByPlaceholderText(/add a subtask/i)).toBeInTheDocument();
     // Should NOT show save-first message
     expect(screen.queryByText(/save the task first/i)).not.toBeInTheDocument();
   });
   ```

2. **Add test: pending subtasks rendered in create mode**:
   ```js
   it('adds pending subtasks in create mode and includes them in onSave', async () => {
     render(
       <TaskModal
         task={null}
         projects={mockProjects}
         teamMembers={mockTeamMembers}
         onSave={mockOnSave}
         onClose={mockOnClose}
       />
     );

     // Fill in required title
     fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Task' } });

     // Add a subtask
     const addInput = screen.getByPlaceholderText(/add a subtask/i);
     fireEvent.change(addInput, { target: { value: 'Subtask 1' } });
     fireEvent.keyDown(addInput, { key: 'Enter' });

     // Subtask should appear in the list
     expect(screen.getByText('Subtask 1')).toBeInTheDocument();

     // Submit the form
     fireEvent.click(screen.getByText(/create/i));

     await waitFor(() => {
       expect(mockOnSave).toHaveBeenCalledWith(
         expect.objectContaining({
           _pendingSubtasks: expect.arrayContaining([
             expect.objectContaining({ title: 'Subtask 1' })
           ])
         })
       );
     });
   });
   ```

3. **Add test: removing a pending subtask in create mode**:
   ```js
   it('removes a pending subtask in create mode', async () => {
     render(
       <TaskModal
         task={null}
         projects={mockProjects}
         teamMembers={mockTeamMembers}
         onSave={mockOnSave}
         onClose={mockOnClose}
       />
     );

     // Add a subtask
     const addInput = screen.getByPlaceholderText(/add a subtask/i);
     fireEvent.change(addInput, { target: { value: 'To Remove' } });
     fireEvent.keyDown(addInput, { key: 'Enter' });

     expect(screen.getByText('To Remove')).toBeInTheDocument();

     // Click the delete button
     const deleteBtn = screen.getByTitle('Delete subtask');
     fireEvent.click(deleteBtn);

     expect(screen.queryByText('To Remove')).not.toBeInTheDocument();
   });
   ```

**File**: `src/__tests__/App.test.jsx`

No changes required — the existing App tests don't directly test `handleSaveTask`. The mock already supports `subtaskService.create()`. If we want to add an integration test for the bulk-create flow, it would require rendering the modal and simulating the full flow, which is complex. The TaskModal tests above cover the `_pendingSubtasks` contract.

---

### Task 4: Run full verification

**Commands**:
```bash
npm run test:run
npm run lint
npm run build
```

All must pass before considering the feature complete.

---

## Execution Strategy

Single subagent, sequential execution (Tasks 1-4). All changes touch overlapping files (`TaskModal.jsx` is modified in Tasks 1 and 3), so parallel execution is not appropriate.

## Risk Assessment

- **Low risk**: No schema changes, no new dependencies, no changes to edit mode
- **Backward compatible**: Edit mode is completely unchanged
- **Testable**: Clear contract (`_pendingSubtasks` on `taskData`) that's easy to assert
