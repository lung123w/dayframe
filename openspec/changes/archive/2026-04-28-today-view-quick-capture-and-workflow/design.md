## Context

The Today view currently serves as the primary daily focus area — it shows tasks the user has chosen to work on today. However, adding a new task requires opening a full TaskModal form, which interrupts keyboard flow. There is also no mechanism to define and follow a repeatable daily workflow (e.g. morning standup, inbox review, EOD wrap-up). The app uses React + FullCalendar with Dexie IndexedDB for persistence.

## Goals / Non-Goals

**Goals:**
- Enable keyboard-first, zero-friction task capture directly in the Today view (type title → Enter → task created)
- Provide a persistent Daily Workflow section where the user defines an ordered list of steps that resets each day
- Integrate both features into the existing Today view without disrupting the current task list or planning session

**Non-Goals:**
- Workflow steps are not full tasks — they are lightweight checklist items, not schedulable or assignable
- No shared/team workflow templates in this change
- No bulk import of workflow steps
- No change to the planning modal (Plan My Day) behaviour

## Decisions

### Quick Capture: Inline input vs floating button
**Decision**: Inline text input pinned at the top of the Today task list.  
**Rationale**: Faster than a floating action button; consistent with tools like Todoist and Linear's quick-add. Pressing Enter submits; Escape clears. The created task gets today's date and `status: 'pending'` with no other fields set. An edit icon on the new task row immediately opens TaskModal pre-populated with the task so the user can enrich it.  
**Alternative considered**: A "+ Add task" button that opens TaskModal directly — rejected because it requires mouse interaction and adds steps before the item is captured.

### Daily Workflow: Separate DB table vs task recurrence
**Decision**: A dedicated `workflowSteps` table in Dexie (id, text, order, createdAt) and a `workflowCompletions` table (stepId, date) for per-day tracking.  
**Rationale**: Workflow steps are fundamentally different from tasks — they have no due date, project, or priority. Reusing the task model would pollute the task list and complicate filtering. A separate table keeps the data model clean and the UI independent.  
**Alternative considered**: Storing steps as recurring tasks with a special flag — rejected due to schema pollution and filtering complexity.

### Workflow reset: Client-side date comparison
**Decision**: On Today view mount, compare each completion record's `date` field with today's ISO date string. Completions from previous days are effectively invisible (not deleted, just not matched), giving a natural reset without a background job.  
**Rationale**: Simple, offline-first, no scheduled job needed. Old completion records act as a historical log.

### Workflow section placement
**Decision**: Workflow section rendered below the quick-capture bar and above (or below) the task list, collapsible.  
**Rationale**: Keeps the capture bar at the top for immediate access; the workflow panel is secondary but prominent enough to be used daily.

## Risks / Trade-offs

- **Risk**: Quick-capture tasks with only a title may accumulate and clutter the Today list if the user never adds details.  
  → Mitigation: The task row shows a visible "incomplete — tap to edit" indicator; backlog sidebar already surfaces un-detailed tasks.

- **Risk**: `workflowCompletions` table grows indefinitely over time.  
  → Mitigation: Acceptable for a personal tool; a future cleanup pass can prune records older than N days. No action in this change.

- **Risk**: Inline capture input may conflict with keyboard shortcuts elsewhere in the app.  
  → Mitigation: Input is only active when focused; global shortcuts (if any) should be suppressed while the input has focus.

## Migration Plan

1. Add `workflowSteps` and `workflowCompletions` tables in a new Dexie schema version (bump version number, add stores).
2. No data migration needed — new tables, additive only.
3. Deploy as a standard release; no feature flag required.
4. Rollback: remove new tables from schema and revert UI components. Existing task data unaffected.

## Open Questions

- Should quick-captured tasks automatically be added to "today's plan" (i.e. appear in the Today ordered list), or just be created with today's due date? **Assumption**: they appear immediately in Today view.
- Should workflow steps support sub-steps or notes? **Assumption**: plain text only for now.
