## Context

Recurring tasks in dayframe are stored as a single base task record with a `recurrencePattern`. At render time, `generateRecurringTasks()` expands the base task into virtual instance objects. These instances share the base task's `id`; they are not persisted individually.

Status overrides per-instance already exist via `statusOverrides` (keyed by instance ISO date) and `statusFromOverrides` (for "this and all future"). However, all other fields (title, description, priority, project, scheduledTime) are taken directly from the base task — meaning editing any of them via the modal updates the base task and changes every instance.

The fix must extend the existing override pattern to cover arbitrary task fields for a single instance edit.

## Goals / Non-Goals

**Goals:**
- Editing a recurring instance with scope "this instance" stores field overrides only for that instance date.
- Editing a recurring instance with scope "all instances" updates the base task as today.
- `generateRecurringTasks` applies per-instance overrides when building virtual instances.
- The `TaskModal` presents a scope selector when opened for a recurring instance.
- No data migration needed — `instanceOverrides` defaults to `{}` for existing tasks.

**Non-Goals:**
- "This and all future" scope for field changes (only status already has this; out of scope for now).
- Editing recurrence pattern itself (always affects all instances by design).
- Per-instance subtask overrides.

## Decisions

### 1. Data model: `instanceOverrides` map on the base task

Store per-instance field overrides as `instanceOverrides: { [instanceDateISO]: { title?, description?, priority?, project?, scheduledTime? } }` on the base task record. This mirrors the existing `statusOverrides` pattern and requires no new DB table or schema version bump (Dexie schema only indexes explicit fields; a new non-indexed field is backward-compatible).

**Alternative considered**: Store each modified instance as a separate task record with a `recurringSourceId` pointer. Rejected — requires schema change, complicates recurrence expansion, and increases DB query complexity.

### 2. Scope selection UI in TaskModal

When `task.isRecurringInstance` is true, show a scope toggle: **"This instance"** (default) vs **"All instances"**. The modal passes `{ ..., _editScope: 'instance' | 'all' }` back to `handleSaveTask`.

**Alternative considered**: Show a confirmation dialog after save, like Google Calendar. Rejected — the modal is already open, so asking inline is simpler and doesn't require an extra modal layer.

### 3. `handleSaveTask` routing in App.jsx

```
if selectedTask.isRecurringInstance:
  if _editScope === 'all':
    update base task (current behavior) — strip virtual fields first
  else:  // 'instance'
    extract overrideable fields from taskData
    merge into base task's instanceOverrides[instanceDate]
    update base task with new instanceOverrides only
else:
  current behavior
```

Virtual fields to strip before any base-task update: `isRecurringInstance`, `recurringSourceId`, `instanceDate`.

Overrideable fields (stored in `instanceOverrides`): `title`, `description`, `priority`, `project`, `scheduledTime`.

Non-overrideable (always from base): `recurrencePattern`, `isRecurring`, `dueDate`, `status` (status already handled via `statusOverrides`).

### 4. `generateRecurringTasks` applies overrides

After computing `instanceDateStr`, look up `task.instanceOverrides?.[instanceDateStr]` and shallow-merge onto the spread object:

```js
const fieldOverrides = task.instanceOverrides?.[instanceDateStr] || {};
tasks.push({ ...task, ...fieldOverrides, dueDate: instanceDateStr, status: resolvedStatus, ... });
```

## Risks / Trade-offs

- **[Risk] Modal opens with base task fields, not instance-specific values** — When a recurring instance is clicked and it has existing `instanceOverrides`, the modal must pre-populate with the override values, not the base task values. The instance object passed via `handleTaskClick` already has overrides merged (since `generateRecurringTasks` will apply them), so this is handled automatically once step 4 is implemented.

- **[Risk] Stale overrides after recurrence pattern changes** — If a user changes the recurrence pattern, old `instanceOverrides` keys (ISO dates) may no longer correspond to valid instances. These become orphaned but harmless (never matched). Accepted trade-off for now.

- **[Risk] `handleSaveTask` currently uses `selectedTask.id`** — For a recurring instance, `selectedTask.id` is the base task's ID (the virtual instance inherits it from the spread). This means `taskService.update(selectedTask.id, ...)` already targets the correct base task record. No ID plumbing change needed.

## Migration Plan

No migration required. `instanceOverrides` is a new optional field; existing task records without it will default to `{}` via optional chaining. Dexie does not require a version bump for non-indexed fields.
