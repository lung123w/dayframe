## Context

This is a single-user React/Vite app with all data persisted in IndexedDB via Dexie. There is no backend. User data (tasks, projects, team members) lives entirely in the browser's local storage. The git repo currently has no mechanism to prevent accidental export of personal data files. The Today view renders tasks filtered to today's date but has no concept of manual ordering. There is no structured daily planning workflow.

## Goals / Non-Goals

**Goals:**
- Ensure any data export/import files are git-ignored so user data is never tracked in source control.
- Allow users to drag-and-drop tasks in the Today view to set a personal priority order, with that order persisted across sessions.
- Provide a "Plan My Day" session modal that surfaces unscheduled and upcoming tasks and lets the user confirm/adjust what appears in Today.

**Non-Goals:**
- No cloud sync or backend storage.
- No multi-user collaboration or shared ordering.
- No changes to the underlying task data model beyond an optional `todayOrder` field.
- No automated suggestions or AI-based planning.

## Decisions

### 1. Git data isolation via `.gitignore`
**Decision**: Add patterns to `.gitignore` to exclude any JSON/CSV export files and a `/data/` directory that could hold user exports.  
**Rationale**: The simplest solution — no code changes needed for the core app. Users who want backups can still create them; they just won't be tracked by git.  
**Alternative considered**: Moving IndexedDB to a file-based store — rejected as it requires significant architectural change and breaks offline-first behavior.

### 2. Today view ordering stored in IndexedDB
**Decision**: Store today's item order as an array of task IDs in a new `settings` table (key-value store) in Dexie, under the key `todayOrder`.  
**Rationale**: Keeps ordering persistent across page reloads without modifying the `tasks` table schema. A generic `settings` table is reusable for future preferences.  
**Alternative considered**: Adding a `todayOrder` integer field to each task — rejected because it creates orphaned ordering data when tasks leave Today.

### 3. Drag-and-drop using HTML5 native drag API
**Decision**: Use the browser's native `draggable` attribute and `dragover`/`drop` events rather than adding a new library.  
**Rationale**: The project already uses FullCalendar's drag for scheduling. Adding another DnD library (e.g., `dnd-kit`) would be reasonable but adds bundle weight. Native DnD is sufficient for a simple list reorder.  
**Alternative considered**: `@dnd-kit/core` — viable if touch support becomes required.

### 4. Daily planning session as a modal
**Decision**: Implement the planning session as a full-screen modal triggered by a "Plan My Day" button in the header or Today view.  
**Rationale**: Modals are already used for task creation (TaskModal). Keeps the main calendar view uncluttered.  
**Alternative considered**: A dedicated route/page — overkill for a single-user tool.

## Risks / Trade-offs

- **Native DnD and touch**: HTML5 drag API does not work on mobile touch screens. → Mitigation: Add up/down arrow buttons as a fallback for touch users.
- **`todayOrder` staleness**: Stored order references task IDs that may be deleted or rescheduled. → Mitigation: Filter out unknown IDs when reading order; append new today-tasks at the bottom.
- **Daily planning scope creep**: The planning modal could grow complex. → Mitigation: Keep v1 simple — show a checklist of suggested tasks, let the user confirm, write the order to `todayOrder`.
