## Why

The Today view lacks a fast-capture mechanism — users must open a full modal to add a task, interrupting their flow. There is also no place to define and track a repeatable daily workflow (e.g. a morning routine or end-of-day checklist), forcing users to either remember it mentally or scatter it across tasks.

## What Changes

- Add an inline quick-capture input at the top of the Today view; pressing Enter creates a bare task immediately with just a title
- Created tasks appear instantly in the Today list with an "edit" affordance to fill in details later
- Add a "Daily Workflow" section to the Today view where users can define an ordered list of recurring workflow steps (e.g. "Check emails", "Standup", "Review PRs")
- Workflow steps can be checked off each day and reset automatically at the start of a new day
- Workflow steps are stored persistently; the user configures them once and they reappear every day

## Capabilities

### New Capabilities

- `today-quick-capture`: Inline, keyboard-first task creation in the Today view by typing a title and pressing Enter
- `daily-workflow-session`: A configurable, persistent ordered checklist of daily workflow steps shown in the Today view, with per-day completion tracking and automatic daily reset

### Modified Capabilities

- `daily-planning-session`: Today view gains two new sections (quick-capture bar and workflow panel) that integrate with the existing planning session layout

## Impact

- `src/components/TodayView.jsx` (or equivalent Today view component) — new UI sections
- `src/db.js` — new `workflowSteps` table and possible `workflowCompletions` table for per-day state
- `src/components/TaskModal.jsx` — quick-capture created tasks should open the modal pre-populated for detail editing
- No breaking changes to existing task schema; new fields are additive
