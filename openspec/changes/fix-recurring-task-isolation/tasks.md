## 1. Data Model

- [x] 1.1 Add `instanceOverrides` field (type `Object`, default `{}`) to the Task model in `src/api.js` (or wherever the Task class is defined)
- [x] 1.2 Verify no Dexie schema version bump is needed (non-indexed field — confirm by checking current schema version and indexed fields)

## 2. Recurrence Expansion

- [x] 2.1 In `src/utils/recurrence.js` `generateRecurringTasks`, after computing `instanceDateStr`, read `task.instanceOverrides?.[instanceDateStr] || {}` and shallow-merge it onto the pushed instance object (after the base spread, before `dueDate`/`status` overrides)
- [x] 2.2 Add unit tests in `src/__tests__/recurrence.test.js` (or create it) covering: (a) no overrides → base values used, (b) overridden title → instance shows override, (c) override on one date → other dates unaffected

## 3. Save Logic

- [x] 3.1 In `src/App.jsx` `handleSaveTask`, detect `selectedTask.isRecurringInstance`
- [x] 3.2 If scope is `'instance'`: extract overrideable fields (`title`, `description`, `priority`, `project`, `scheduledTime`) from `taskData`, merge into `sourceTask.instanceOverrides[selectedTask.instanceDate]`, and call `taskService.update(sourceId, { instanceOverrides: updatedMap })` — do NOT write other taskData fields to the base task
- [x] 3.3 If scope is `'all'`: strip virtual fields (`isRecurringInstance`, `recurringSourceId`, `instanceDate`, `_editScope`) from `taskData` and update base task as before
- [x] 3.4 Ensure `loadData()` is called after both branches

## 4. TaskModal UI

- [x] 4.1 Accept `isRecurringInstance` flag via the task prop in `TaskModal.jsx`
- [x] 4.2 Add a scope toggle/radio ("This instance" / "All instances") rendered only when `isRecurringInstance` is true; default to "This instance"
- [x] 4.3 Include `_editScope: 'instance' | 'all'` in the `taskData` object passed to `onSave`
- [x] 4.4 Ensure the modal initialises form fields from the instance's effective values (already correct once `generateRecurringTasks` applies overrides, since the clicked instance object is passed as `task`)

## 5. Verification

- [x] 5.1 Run `npm run test:run` and confirm all tests pass
- [ ] 5.2 Manual test: create a daily recurring task, edit one instance title with "This instance" scope, confirm other instances are unchanged
- [ ] 5.3 Manual test: edit a recurring instance with "All instances" scope, confirm all instances update
- [x] 5.4 Run `npm run lint` and fix any warnings
