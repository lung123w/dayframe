# Design: Task Status Simplification and Goals Features

**Date:** 2026-03-15  
**Status:** Approved  
**Author:** Claude (Brainstorming Session)

## Overview

Three enhancements to DayFrame task management:
1. Simplify task status from 3 states to 2 (completed/pending)
2. Show all outstanding (pending) tasks in the BacklogSidebar
3. Add yearly goals panel above weekly objectives

## Background

Current system has 3 task statuses (`todo`, `in-progress`, `completed`) which adds complexity. Users want simpler binary state (done vs not done) and better visibility into all pending work. Additionally, yearly goal tracking is needed for long-term planning.

## Design Decisions

### Enhancement 1: Status Simplification

**Current State:**
- 3 statuses: `todo`, `in-progress`, `completed`
- TaskModal dropdown shows all 3 options
- Stats show Total/Done/Active counts

**New State:**
- 2 statuses: `pending`, `completed`
- `pending` represents all incomplete work (replaces both `todo` and `in-progress`)
- Stats show Total/Done/Pending counts

**Migration Strategy:**
- Database migration to convert existing tasks
- `todo` → `pending`
- `in-progress` → `pending`
- `completed` → `completed` (unchanged)

**Files Affected:**
- `src/components/TaskModal.jsx` - status dropdown (lines 538-548)
- `src/App.jsx` - stats display (lines 321-338)
- Backend task model validation

### Enhancement 2: Outstanding Tasks in Backlog

**Current BacklogSidebar:**
- Shows only unscheduled tasks (no due date)
- Located on left side of planner

**New BacklogSidebar:**
- Shows ALL pending tasks (regardless of due date)
- Count badge showing total outstanding
- Visual indicator for overdue tasks
- Sorted by: priority (high→medium→low), then creation date
- Optional filter toggle: "All Pending" vs "Unscheduled Only"

**Filter Logic:**
```javascript
const outstandingTasks = tasks.filter(t => t.status === 'pending');
```

**Files Affected:**
- `src/components/BacklogSidebar.jsx` - update filtering logic
- `src/components/DailyPlanner.jsx` - pass filtered tasks

### Enhancement 3: Yearly Goals Panel

**Component Design:**
- New component: `YearlyGoals.jsx`
- Collapsible panel (default: collapsed)
- Free-form textarea for goals
- Auto-saves on blur or after 2s inactivity
- Year auto-detected from current date

**Data Model:**
```javascript
{
  year: number,        // e.g., 2026
  goals: string,       // free-form text
  updatedAt: timestamp
}
```

**Backend API:**
- Endpoint: `/api/yearly-goals?year=2026`
- Methods: `GET /api/yearly-goals?year={year}`, `PUT /api/yearly-goals`
- Service: `yearlyGoalService.getByYear(year)`, `yearlyGoalService.upsert(data)`

**UI Layout:**
```
[Toolbar]
[Yearly Goals - Collapsible] ← NEW
[Weekly Objectives]
[Mini Week Bar]
[Day Columns...]
```

**Persistence:**
- Panel collapsed/expanded state → localStorage key: `yearlyGoals.collapsed`
- Goals content → backend database

**Files Affected:**
- `src/components/YearlyGoals.jsx` - new component
- `src/components/DailyPlanner.jsx` - integrate component
- `src/api.js` - add yearlyGoalService
- Backend - new yearly_goals table and endpoints

## Implementation Approach

### Phase 1: Backend Changes
1. Create yearly_goals table
2. Add migration for task status conversion
3. Update task model validation
4. Create yearly goals API endpoints

### Phase 2: Frontend - Status Simplification
1. Update TaskModal status dropdown
2. Update App.jsx stats display
3. Update any status-dependent logic
4. Test existing recurring tasks

### Phase 3: Frontend - Outstanding Tasks
1. Update BacklogSidebar filtering
2. Add count badge
3. Add overdue visual indicator
4. Optional: Add filter toggle

### Phase 4: Frontend - Yearly Goals
1. Create YearlyGoals component
2. Add to DailyPlanner layout
3. Implement auto-save
4. Add localStorage for panel state

## Testing Strategy

1. **Status Migration:**
   - Verify all existing tasks migrated correctly
   - Test recurring task status overrides still work
   - Test task creation/editing with new statuses

2. **Outstanding Tasks:**
   - Verify all pending tasks appear in backlog
   - Test click-to-edit functionality
   - Test count badge accuracy

3. **Yearly Goals:**
   - Test auto-save functionality
   - Test year switching (2026 → 2027 on Jan 1)
   - Test panel collapse state persistence
   - Test concurrent editing (multiple tabs)

## Success Criteria

- ✅ All tasks have either `pending` or `completed` status
- ✅ BacklogSidebar shows count of all pending tasks
- ✅ Yearly goals persist per calendar year
- ✅ No regressions in existing planner functionality
- ✅ UI remains responsive and clean

## Future Considerations

- Add progress indicators for yearly goals
- Link yearly goals to specific tasks/projects
- Add goal templates or categories
- Archive old year goals
