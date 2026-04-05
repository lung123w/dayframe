# DayFrame UI Enhancements: Vertical Sidebar + Horizontal Scrolling + Time Blocks

**Date:** 2026-04-05  
**Status:** Approved  
**Approach:** Progressive Enhancement (Approach 1)

## Overview

Redesign DayFrame's layout and planner view to support:
1. Vertical sidebar navigation (grouped sections like Sunsama)
2. Horizontal scrolling week calendar (show full week, scroll to see other weeks)
3. Time block display on tasks (chronological list with scheduled times)

## Goals

- Move navigation from horizontal header to vertical sidebar with grouped sections
- Enable viewing multiple weeks via horizontal scrolling (not just week-by-week jumping)
- Add optional scheduled times to tasks and display them chronologically
- Support user's 1-hour/day time-blocking routine (job search, guitar practice)

## Requirements Summary

**From user:**
1. Put all tabs into vertical sidebar (grouped sections)
2. Add horizontal scroll bar in planner view to show tasks across upcoming weeks
3. Add time block view on each day (chronological list with times)

**User selections:**
- **Sidebar:** Grouped sections (Views: Planner/Habits/Projects, Tools: Notifications/Backup)
- **Scrolling:** Show full 7-day week, scroll to navigate past/future weeks
- **Time display:** Chronological list format with scheduled times displayed (not grid-based)

## Architecture & Layout Changes

### Current Layout
```
┌─────────────────────────────────────────┐
│ Header (horizontal nav + brand)         │
├─────────────────────────────────────────┤
│ Main Content                            │
│   ├── Toolbar (buttons, stats)          │
│   └── Daily Planner (week grid)         │
└─────────────────────────────────────────┘
```

### New Layout
```
┌──────┬──────────────────────────────────┐
│ Side │ Main Content                     │
│ bar  │   ├── Toolbar (if needed)        │
│      │   └── Horizontal scroll wrapper  │
│      │       └── Week grid (7 days)     │
└──────┴──────────────────────────────────┘
```

### Sidebar Structure

**Brand Section:**
- DayFrame logo/icon at top
- App name

**VIEWS Section:**
- Planner (FaCalendar icon)
- Habits (FaLink icon)
- Projects (FaFolder icon)

**TOOLS Section:**
- Notifications (FaBell icon)
- Backup (FaDownload icon)

### Layout Implementation

**App.jsx changes:**
- Change root layout from `flex-direction: column` to `flex-direction: row`
- Remove horizontal header
- Add sidebar component (fixed width ~200px)
- Main content takes remaining width (flex: 1)

**Sidebar component:**
- New file: `src/components/Sidebar.jsx`
- Fixed width (~200px)
- Dark background (match current header #1E293B)
- Sticky/fixed positioning
- Section headers ("VIEWS", "TOOLS") in muted text
- Navigation items highlight on active view

## Horizontal Scrolling Week View

### Current Behavior
- Shows 7 day columns in CSS grid
- Arrow buttons navigate previous/next week
- Week jumps discretely (no smooth scrolling)
- File: `DailyPlanner.jsx` with `handlePrevWeek`/`handleNextWeek`

### New Behavior
- Full week (7 days) always visible in viewport
- Horizontal scroll container shows multiple weeks (3 weeks: previous, current, next)
- Smooth scrolling left/right to see past/future weeks
- Current week starts centered in view
- Total: 21 day columns rendered (7 days × 3 weeks)

### Implementation Approach

**Component structure:**
```jsx
<div className="week-scroll-container">
  <div className="week-grid">
    {/* Render 21 DayColumn components */}
    {/* Week -1 (days -7 to -1) */}
    {/* Week 0 (days 0 to 6) - current week */}
    {/* Week +1 (days 7 to 13) */}
  </div>
</div>
```

**CSS:**
- `.week-scroll-container`: `overflow-x: auto`, `scroll-behavior: smooth`
- Optional: `scroll-snap-type: x mandatory` to snap to weeks
- Width calculation: Each day column gets equal width, 7 columns fit viewport exactly

**Navigation:**
- Keep existing prev/next week buttons but make them scroll smoothly
- Alternative: Remove buttons and rely entirely on scroll/drag

**State management:**
- Track `weekStartDate` (existing state)
- When scrolling near edges, render additional weeks dynamically (infinite scroll pattern)
- Or simpler: Just render 3 weeks at a time, buttons shift the week range

## Time Block Display on Tasks

### Database Changes

**Add column to tasks table:**
```sql
ALTER TABLE tasks ADD COLUMN scheduledTime TEXT DEFAULT NULL;
```

**Format:**
- Store as "HH:MM" in 24-hour format (e.g., "19:30", "09:00")
- Nullable (tasks without scheduled time remain valid)

### Task Display Changes

**Sorting logic:**
- Tasks with `scheduledTime` sort chronologically by time first
- Then by existing sort order (sortOrder field, then priority)
- Tasks without `scheduledTime` appear at end of list

**Visual display:**
- Time badge on task card showing scheduled time
- Format: 12-hour with am/pm suffix (e.g., "7:30p", "9a", "12:30p")
- Position: Top-left of task card or next to task title
- Styling: Small, muted text color (not distracting)
- Use existing `formatTimeDisplay` function pattern from `DayColumn.jsx`

### TaskModal Changes

**Add time picker field:**
- HTML time input: `<input type="time" />`
- Label: "Scheduled Time" (optional)
- Position: Below due date field
- Stores in 24-hour format ("HH:MM")
- Clear button to remove scheduled time

**Form state:**
- Add `scheduledTime` to task form state
- Save to database on task create/update

### DayColumn Changes

**Enhance task rendering:**
- Add time badge to task card UI
- Modify sorting logic to prioritize `scheduledTime`
- Reuse existing task card structure (minimal changes)

## Component Changes Summary

### New Components
- `Sidebar.jsx` (~150 lines)
  - Brand section at top
  - Grouped navigation sections
  - Active state highlighting
  - Click handlers for view switching

### Modified Components

**App.jsx:**
- Change layout from vertical to horizontal (sidebar + main)
- Remove horizontal header
- Move view state management (still controls activeView)
- Render Sidebar component

**DailyPlanner.jsx:**
- Wrap week grid in horizontal scroll container
- Render 3 weeks of day columns (21 columns total)
- Center current week on mount
- Optional: Infinite scroll for additional weeks

**DayColumn.jsx:**
- Add time badge rendering for tasks with `scheduledTime`
- Update sort logic to prioritize scheduled time
- Minor CSS for time badge styling

**TaskModal.jsx:**
- Add time picker input field
- Add scheduledTime to form state
- Save scheduledTime on task create/update

### CSS Changes

**App.css:**
- New sidebar styles (width, colors, spacing)
- Layout flex-direction change
- Remove header styles (move to sidebar)

**DailyPlanner.css:**
- Horizontal scroll container styles
- Week grid adjustments for scrolling
- Optional: scroll-snap styles

**DayColumn.css:**
- Time badge styles (position, color, typography)

## Data Model Changes

### Database Migration

```sql
-- Add scheduledTime column to tasks
ALTER TABLE tasks ADD COLUMN scheduledTime TEXT DEFAULT NULL;
```

**Migration strategy:**
- Column is nullable, so existing tasks remain valid
- No data migration needed (existing tasks have NULL scheduledTime)
- Add migration in `server/db.js` after line 149 (existing migrations)

### API Changes

**No API changes needed:**
- Existing endpoints handle arbitrary fields
- `taskService.create` and `taskService.update` will automatically handle `scheduledTime`

## User Experience

### Workflow for Time Blocking

**User wants to schedule "Job Search" for Mon/Wed/Fri 7:30pm:**

1. Create/edit task "Job Search - Applications"
2. Set due date: Monday
3. Set scheduled time: 19:30 (7:30pm)
4. Save task
5. Task appears in Monday column with "7:30p" badge
6. Task sorted chronologically (appears before 8pm tasks, after 6pm tasks)

**Repeat for Wednesday and Friday:**
- Can use recurring tasks (existing feature) + scheduled time
- Or create individual tasks for each day

### Navigation

**View multiple weeks:**
1. Planner shows current week (7 days visible)
2. User scrolls right → sees next week's tasks
3. User scrolls left → sees previous week's tasks
4. Or clicks prev/next week buttons for discrete jumps

**Switch views:**
1. Click "Habits" in sidebar → switches to Habits view
2. Click "Projects" in sidebar → switches to Projects view
3. Active view highlighted in sidebar

## Technical Considerations

### Performance

**Rendering 21 day columns:**
- Each DayColumn generates recurring tasks (existing logic)
- Rendering 21 columns instead of 7 might slow down with many tasks
- Mitigation: Virtualization if performance degrades (future optimization)

### Responsive Design

**Mobile/tablet considerations:**
- Sidebar should collapse to hamburger menu on small screens
- Horizontal scroll works naturally on mobile (touch swipe)
- Consider reducing visible days on mobile (5 days instead of 7)

### Browser Compatibility

**Features used:**
- CSS `overflow-x: auto` (widely supported)
- HTML5 `<input type="time">` (supported in modern browsers)
- Optional: Polyfill for older browsers

## Testing Strategy

### Manual Testing

1. **Sidebar navigation:**
   - Click each nav item, verify view switches
   - Verify active state highlighting
   - Check Tools section buttons (Notifications, Backup) still work

2. **Horizontal scrolling:**
   - Scroll left/right, verify multiple weeks visible
   - Verify current week loads centered
   - Test prev/next week buttons

3. **Time display:**
   - Create task with scheduled time, verify badge appears
   - Create task without time, verify no badge
   - Verify tasks sort chronologically by time
   - Edit task to add/remove time, verify update

4. **Responsive:**
   - Test on mobile viewport
   - Test on tablet viewport
   - Verify sidebar collapses or scrolling adapts

### Edge Cases

- Tasks with same scheduled time (verify stable sort by priority)
- Tasks with time but no due date (should not appear in day columns)
- Recurring tasks with scheduled time (verify all instances show time)
- Very long task titles with time badge (verify no overflow)

## Implementation Estimate

**Total effort:** 4-6 hours

**Breakdown:**
- Sidebar component: 1-1.5 hours
- Layout restructure (App.jsx): 30 minutes
- Horizontal scrolling: 1-2 hours
- Time display (database + UI): 1.5-2 hours
- Testing and polish: 30-60 minutes

## Future Enhancements

**Not in this design (possible future work):**
- Full time-grid calendar view (like Google Calendar)
- Drag-and-drop to change scheduled times
- Duration-based visual blocks
- Job search tracking view (separate feature)
- Weekly time block templates (recurring time blocks)

## Success Criteria

**This design is successful if:**
1. ✅ Sidebar navigation works with grouped sections
2. ✅ User can scroll horizontally to see multiple weeks
3. ✅ Tasks with scheduled times display chronologically with time badges
4. ✅ Existing features (recurring tasks, drag-drop, subtasks) still work
5. ✅ UI feels more organized and supports time-blocking workflow
6. ✅ Implementation takes 4-6 hours as estimated

## References

- Sunsama UI screenshot (provided by user)
- Current DayFrame architecture: `/docs/plans/` (if exists)
- Existing components: `DayColumn.jsx`, `DailyPlanner.jsx`, `TaskModal.jsx`
