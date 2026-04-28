## 1. Database Schema

- [x] 1.1 Bump Dexie schema version in `src/db.js` and add `workflowSteps` table (fields: id, text, order, createdAt)
- [x] 1.2 Add `workflowCompletions` table to Dexie schema (fields: id, stepId, date)
- [x] 1.3 Create `WorkflowStep` model class in `src/db.js`
- [x] 1.4 Create `WorkflowCompletion` model class in `src/db.js`
- [x] 1.5 Add `workflowStepService` with `getAll`, `create`, `update`, `delete` methods in `src/db.js`
- [x] 1.6 Add `workflowCompletionService` with `getForDate`, `create`, `deleteByStepAndDate` methods in `src/db.js`

## 2. Quick Capture — Today View

- [x] 2.1 Locate (or create) the Today view component; add an inline `<input>` at the top of the task list for quick capture
- [x] 2.2 Implement Enter key handler: create task via `taskService.create` with title, today's date, status `pending`, no other fields
- [x] 2.3 Implement Escape key handler: clear the input text
- [x] 2.4 Guard against empty submission (no task created if input is blank)
- [x] 2.5 After task creation, reload/update Today task list so the new task appears immediately without page reload
- [x] 2.6 Add edit icon to each Today task row that opens TaskModal pre-populated with that task's data
- [x] 2.7 After TaskModal save, refresh the Today task list to reflect updates

## 3. Daily Workflow Section — UI

- [x] 3.1 Create `DailyWorkflow.jsx` component in `src/components/` with collapsible section header
- [x] 3.2 Render ordered list of workflow steps loaded from `workflowStepService.getAll()`
- [x] 3.3 Add inline text input + Enter handler to append a new workflow step via `workflowStepService.create()`
- [x] 3.4 Add delete button per step that calls `workflowStepService.delete()` and refreshes the list
- [x] 3.5 Implement collapse/expand toggle; persist collapsed state in component local state (or localStorage)

## 4. Daily Workflow Section — Completion Tracking

- [x] 4.1 On component mount, load completions for today's date via `workflowCompletionService.getForDate(today)`
- [x] 4.2 Render each step with a checkbox; checked state derived from today's completions
- [x] 4.3 On checkbox check: call `workflowCompletionService.create({ stepId, date: today })` and update UI
- [x] 4.4 On checkbox uncheck: call `workflowCompletionService.deleteByStepAndDate(stepId, today)` and update UI
- [x] 4.5 Verify that steps with completions from a previous date appear unchecked (natural reset via date comparison)

## 5. Integration into Today View

- [x] 5.1 Import and render `DailyWorkflow` component in the Today view below the quick-capture input
- [x] 5.2 Load `workflowSteps` and `workflowCompletions` in Today view (or let `DailyWorkflow` manage its own state)
- [x] 5.3 Verify layout: quick-capture bar at top, Daily Workflow section below, task list below that (or as configured)

## 6. App State Wiring

- [x] 6.1 Expose workflow step handlers from `App.jsx` if Today view relies on top-level state, or confirm `DailyWorkflow` is self-contained
- [x] 6.2 Ensure quick-capture created tasks appear in Today view state without requiring a manual refresh

## 7. Tests

- [x] 7.1 Write unit test: quick-capture creates task on Enter and clears input
- [x] 7.2 Write unit test: quick-capture ignores empty input
- [x] 7.3 Write unit test: `workflowStepService` CRUD operations
- [x] 7.4 Write unit test: `workflowCompletionService` — completions only returned for matching date
- [x] 7.5 Run `npm run test:run` and confirm all tests pass
- [x] 7.6 Run `npm run lint` and fix any reported issues
