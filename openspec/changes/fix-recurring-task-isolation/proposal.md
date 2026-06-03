## Why

When a user edits a recurring task instance (e.g., changes its title or description), the change is applied to the base task record, which propagates to all other instances of the same recurrence series. This violates user expectation: editing one instance should only affect that instance (or optionally "this and all future" instances), not the entire series.

## What Changes

- The task save flow in `App.jsx` must detect when the task being edited is a recurring instance and handle it differently from a base task edit.
- Editing a single recurring instance will store per-instance field overrides (title, description, priority, project, etc.) on the base task rather than overwriting the base task fields.
- The `generateRecurringTasks` utility must apply per-instance field overrides when expanding instances.
- The `TaskModal` must communicate the edit scope (this instance vs. all instances) back to the save handler when editing a recurring instance.
- A new `instanceOverrides` map field is added to the task schema to store per-instance field overrides keyed by instance date ISO string.

## Capabilities

### New Capabilities
- `recurring-instance-field-overrides`: Ability to override arbitrary task fields (title, description, priority, project, scheduledTime) for a single recurring instance without changing the base task or other instances.

### Modified Capabilities

## Impact

- `src/App.jsx` — `handleSaveTask` logic
- `src/utils/recurrence.js` — `generateRecurringTasks` must merge `instanceOverrides`
- `src/components/TaskModal.jsx` — must present scope choice (this instance / all instances) when editing a recurring instance and pass edit scope back
- `src/api.js` (or equivalent db file) — Task model gains `instanceOverrides` field
- Existing `statusOverrides` pattern is already established; this change follows the same pattern for arbitrary fields
