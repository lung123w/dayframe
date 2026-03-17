# Three Enhancements Design Document

**Date:** March 17, 2026  
**Author:** Claude  
**Status:** Design Phase

---

## Executive Summary

Three independent enhancements to improve the task management application:

1. **Remove Teams Functionality** - Complete removal of team member assignment features
2. **Enhance Yearly Goals** - Add hybrid structure (textarea + checkbox list) with image support
3. **Add Projects Management Tab** - New tab to view, edit, and delete projects

**Implementation Approach:** Sequential (A → B → C) to minimize conflicts and enable incremental testing.

---

## Enhancement 1: Remove Teams Functionality

### Current State
- `TeamManagement` component with full CRUD operations
- Team tab in main navigation
- Task assignment features (`assignedTo` field with multi-select)
- Team member display in Calendar, DayPanel, DayColumn views
- Backend API endpoints for team members

### Design Decision
**Complete removal** of all team-related UI and functionality. No hidden features, no data preservation in UI.

### Rationale
- Single-user application scope (per CLAUDE.md)
- Simplifies task model and UI
- Reduces maintenance burden
- User confirmed "remove all assignment features"

### Affected Components

**Files to Delete:**
- `src/components/TeamManagement.jsx`
- `src/components/TeamManagement.css`

**Files to Modify:**
- `src/App.jsx` - Remove Team tab, teamMembers state, handlers
- `src/components/TaskModal.jsx` - Remove assignedTo field and multi-select
- `src/components/DayColumn.jsx` - Remove team member name display
- `src/components/Calendar.jsx` - Remove team member references in event rendering
- `src/components/DayPanel.jsx` - Remove team member display in task cards

**Backend (Optional - Keep for Data Preservation):**
- `server/routes/teamMembers.js` - Can remain for backward compatibility
- `src/api.js` - `teamMemberService` can remain but unused

### Data Migration Strategy
**None required** - existing `assignedTo` data in database remains but is ignored by UI.

### Testing Strategy
1. Verify Team tab removed from navigation
2. Verify TaskModal no longer shows assignment field
3. Verify task cards show correctly without team member names
4. Verify no console errors related to teamMembers
5. Manual smoke test: Create task, view in Calendar/Day/Week views

---

## Enhancement 2: Yearly Goals Hybrid Structure

### Current State
- Single textarea for free-form goals text
- Image paste support (recently added)
- Images stored as base64 JSON array in `yearly_goals.images` column
- Auto-save after 2 seconds or on blur

### Design Decision
**Hybrid structure** with:
1. **Textarea** at top for vision/free-form notes
2. **Checkbox list** below (similar to WeeklyObjectives)
3. **Images** remain attached to overall yearly goals section

### Rationale
- User wants both structured goals (trackable) and free-form vision
- Matches mental model: broad vision + specific goals
- Maintains flexibility while adding accountability

### Data Model

**Current Schema:**
```sql
CREATE TABLE yearly_goals (
  id INTEGER PRIMARY KEY,
  year INTEGER UNIQUE,
  goals TEXT,
  images TEXT,  -- JSON array of base64 strings
  created_at TEXT,
  updated_at TEXT
);
```

**New Schema (Migration Required):**
```sql
CREATE TABLE yearly_goals (
  id INTEGER PRIMARY KEY,
  year INTEGER UNIQUE,
  vision TEXT,           -- Renamed from 'goals', free-form notes
  goals TEXT,            -- NEW: JSON array of {text, completed} objects
  images TEXT,           -- Existing: JSON array of base64 strings
  created_at TEXT,
  updated_at TEXT
);
```

**Migration Logic:**
1. Add `vision` column as TEXT
2. Copy existing `goals` → `vision`
3. Set `goals` to empty JSON array `[]`

### Component Structure

**YearlyGoals.jsx Changes:**
```jsx
// State structure
{
  vision: "string",              // Free-form textarea
  goals: [{text, completed}],    // Checkbox list
  images: ["base64", ...]        // Existing images
}

// UI Layout:
// [Textarea for vision]
// [Checkbox list for goals]
// [Image preview grid]
// [Paste indicator]
```

### UI Behavior
1. **Vision textarea** - auto-saves after 2s idle or blur (existing behavior)
2. **Goals checklist**:
   - Add new goal with input + button
   - Toggle completion with checkbox
   - Delete goal with trash icon
   - Auto-saves on each change
3. **Images** - paste anywhere in component (existing behavior)

### Testing Strategy
1. Migration test: Existing vision text preserved
2. Checkbox functionality: Add, complete, delete goals
3. Auto-save: Vision and goals save independently
4. Image paste: Still works with new structure
5. Data persistence: Reload page, verify all data intact

---

## Enhancement 3: Projects Management Tab

### Current State
- `ProjectModal` component exists for create/edit
- Modal only accessible when creating/editing tasks
- No standalone view to see all projects
- Projects displayed in task forms and calendar events (color-coded)

### Design Decision
**New Projects tab** with list view, following TeamManagement pattern:
- View all projects in table format
- Edit existing projects (opens ProjectModal)
- Delete projects with confirmation
- Add new projects via button

### Rationale
- Matches existing TeamManagement UI pattern (familiar UX)
- Provides visibility into all projects at once
- Enables project management without creating tasks
- Simple CRUD without complex features (no task counts, filtering)

### Component Structure

**New Files:**
- `src/components/ProjectsView.jsx` - Main component
- `src/components/ProjectsView.css` - Styles

**Modified Files:**
- `src/App.jsx` - Add Projects tab to navigation

### UI Design

**Layout (follows TeamManagement pattern):**
```
+------------------------------------------+
| Projects                    [+ New Project] |
+------------------------------------------+
| Table with columns:                       |
| - Project Name                            |
| - Color (visual swatch)                   |
| - Actions (Edit | Delete)                 |
+------------------------------------------+
```

**Interactions:**
1. **New Project** button → Opens ProjectModal in create mode
2. **Edit** icon → Opens ProjectModal in edit mode
3. **Delete** icon → Confirmation dialog → Deletes project

### Data Flow
```
ProjectsView (list) 
  ↓
App.jsx (state: projects, handlers)
  ↓
ProjectModal (create/edit)
  ↓
projectService.create() / update() / delete()
  ↓
App.loadData() (refresh list)
```

### Delete Behavior
- **Simple confirmation** - "Are you sure you want to delete this project?"
- **No cascade** - Tasks with deleted project will reference non-existent project ID
  - Calendar/UI handles this gracefully (shows task without project info)
  - Future enhancement could reassign tasks or warn user

### Testing Strategy
1. View all projects in table
2. Create new project via button
3. Edit project name/color
4. Delete project with confirmation
5. Verify table updates after each operation
6. Test with 0, 1, and many projects

---

## Implementation Order

**Sequential execution (Approach A):**

1. **Task Set 1: Remove Teams** (Est. 30-45 minutes)
   - Task 1.1: Remove Team tab and state from App.jsx
   - Task 1.2: Remove TeamManagement component files
   - Task 1.3: Remove assignment UI from TaskModal
   - Task 1.4: Remove team member display from Calendar
   - Task 1.5: Remove team member display from DayPanel/DayColumn
   - Task 1.6: Manual testing and commit

2. **Task Set 2: Yearly Goals Hybrid** (Est. 45-60 minutes)
   - Task 2.1: Database migration (add vision column, migrate data)
   - Task 2.2: Update yearlyGoalService API methods
   - Task 2.3: Restructure YearlyGoals component state
   - Task 2.4: Add vision textarea UI
   - Task 2.5: Add checkbox list UI
   - Task 2.6: Wire up auto-save for both sections
   - Task 2.7: Testing and commit

3. **Task Set 3: Projects Management Tab** (Est. 30-45 minutes)
   - Task 3.1: Create ProjectsView component with table layout
   - Task 3.2: Add Projects tab to App.jsx navigation
   - Task 3.3: Implement edit functionality (open ProjectModal)
   - Task 3.4: Implement delete functionality with confirmation
   - Task 3.5: Add CSS styling (follow TeamManagement pattern)
   - Task 3.6: Testing and commit

**Total Estimated Time:** 2-2.5 hours

---

## Risk Assessment

### Low Risk
- **Teams Removal** - Simple deletion, no data migration
- **Projects Tab** - New component, no modification to existing data

### Medium Risk
- **Yearly Goals Migration** - Requires database schema change
  - Mitigation: Test migration with backup data first
  - Rollback: Revert migration and component changes

### Dependencies
- All three enhancements touch `App.jsx` (navigation, state)
  - Mitigation: Sequential implementation avoids merge conflicts

---

## Rollback Strategy

Each enhancement is independent:

1. **Teams Removal** - Revert commits, re-add TeamManagement tab
2. **Yearly Goals** - Revert migration and component, restore single textarea
3. **Projects Tab** - Revert component addition, remove tab from App.jsx

---

## Future Considerations

**Teams Removal:**
- Could add single "owner" field in future if collaboration needed

**Yearly Goals:**
- Could add categories/themes to goals (e.g., "Health", "Career")
- Could visualize progress with percentage complete

**Projects Tab:**
- Could show task count per project
- Could add project archiving
- Could prevent deletion of projects with tasks
- Could add project sorting/filtering

---

## Acceptance Criteria

### Enhancement 1: Teams Removal ✓
- [ ] Team tab removed from navigation
- [ ] TeamManagement component deleted
- [ ] No assignment UI in TaskModal
- [ ] No team member names in Calendar events
- [ ] No team member names in DayPanel/DayColumn
- [ ] No console errors
- [ ] App functions normally without team features

### Enhancement 2: Yearly Goals ✓
- [ ] Database migration completes successfully
- [ ] Existing vision text preserved in `vision` field
- [ ] Textarea for vision at top
- [ ] Checkbox list for goals below
- [ ] Can add, complete, delete goals
- [ ] Vision and goals auto-save independently
- [ ] Images still paste and display correctly
- [ ] Data persists across page reloads

### Enhancement 3: Projects Tab ✓
- [ ] Projects tab appears in navigation
- [ ] Table displays all projects with name and color
- [ ] Can create new project via button
- [ ] Can edit existing project (opens modal)
- [ ] Can delete project with confirmation
- [ ] Table updates after each operation
- [ ] Styling matches existing UI patterns

---

## Open Questions

None - all design decisions confirmed with user:
- ✓ Teams: Remove all features (not hide)
- ✓ Yearly Goals: Hybrid structure (textarea + checklist)
- ✓ Projects: View/edit/delete only (no task counts)
- ✓ Implementation: Sequential approach (Approach A)
