# Design: Goals Enhancements - Images and Completion

**Date:** 2026-03-16  
**Status:** Approved  
**Author:** Claude (Brainstorming Session)

## Overview

Two enhancements to goal management features:
1. Add image paste support to Yearly Goals
2. Add completion checkboxes to Weekly Goals

## Background

Users want to enhance goal tracking with visual elements (images for yearly goals) and better progress tracking (completion checkboxes for weekly goals). Both features follow existing patterns in the codebase.

## Design Decisions

### Enhancement 1: Yearly Goals - Image Support

**Current State:**
- YearlyGoals component has simple textarea for goals text
- Stores goals as plain text string in yearly_goals table

**New State:**
- Support pasting images (Ctrl+V) into yearly goals
- Display image preview thumbnails below textarea
- Store images as base64 JSON array (same pattern as TaskModal)

**Data Model:**
```sql
ALTER TABLE yearly_goals ADD COLUMN images TEXT NOT NULL DEFAULT '[]';
```

**UI Changes:**
- Add paste event handler to textarea container
- Display image preview grid below textarea
- Add lightbox for full-size image viewing
- Add remove button per image
- Reuse existing image preview CSS from TaskModal

**User Flow:**
1. User types goals in textarea
2. User pastes image (Ctrl+V) while focused
3. Image converted to base64 and appears as thumbnail
4. Click thumbnail to view full-size in lightbox
5. Click X to remove image
6. Auto-saves images array with goals text

**Files Affected:**
- `server/db.js` - Add images column to yearly_goals table
- `src/components/YearlyGoals.jsx` - Add paste handler and image preview
- `src/components/YearlyGoals.css` - Add image preview styles

**Technical Details:**
- Paste handler: Convert clipboard image to base64 (FileReader API)
- Storage: JSON array of base64 strings in database
- Preview: Grid layout with 150px thumbnails
- Lightbox: Click to show full-size overlay
- Auto-save: Debounced save includes images array

---

### Enhancement 2: Weekly Goals - Completion Checkboxes

**Current State:**
- WeeklyObjectives stores goals as array of strings
- No way to mark goals as completed
- Display as simple list with remove button

**New State:**
- Goals stored as `{text: string, completed: boolean}[]`
- Checkbox per goal to toggle completion
- Completed goals show strike-through
- Completion count in badge

**Data Model Migration:**
```javascript
// Migrate existing weekly_objectives
// OLD: objectives: ["Goal 1", "Goal 2"]
// NEW: objectives: [{text: "Goal 1", completed: false}, {text: "Goal 2", completed: false}]
```

**UI Changes:**
- Add checkbox before each goal text
- Click checkbox to toggle completed state
- Completed goals: strike-through + reduced opacity
- Badge shows completion count: "Weekly Goals (3/5)"
- Keep existing add/remove functionality

**User Flow:**
1. User sees list of weekly goals with checkboxes
2. Click checkbox to mark goal as completed
3. Goal text shows strike-through style
4. Badge updates to show "3/5 completed"
5. Auto-saves completion state to backend
6. Can still remove goals (completed or not)

**Files Affected:**
- `server/db.js` - Add migration for weekly_objectives structure
- `src/components/WeeklyObjectives.jsx` - Update state management and UI
- `src/components/WeeklyObjectives.css` - Add completed goal styles

**Technical Details:**
- State: Array of `{text, completed}` objects
- Toggle handler: Update completed field, save to backend
- Migration: Wrap existing string arrays on server startup
- CSS: `.wo-item.completed { text-decoration: line-through; opacity: 0.6; }`
- Badge: Show `completed count / total count`
- Backward compatible: Auto-migrate old format on load

---

## Implementation Approach

### Phase 1: Backend Changes
1. Add images column to yearly_goals table
2. Add migration for weekly_objectives data structure
3. No API endpoint changes needed (already handle JSON)

### Phase 2: Yearly Goals Images
1. Add paste event handler to YearlyGoals component
2. Add image state management (images array)
3. Create image preview grid UI
4. Add lightbox overlay component
5. Update save handler to include images
6. Add CSS for image previews

### Phase 3: Weekly Goals Completion
1. Update WeeklyObjectives state from string[] to object[]
2. Add checkbox UI to each goal item
3. Add toggle completion handler
4. Update badge to show completion count
5. Add CSS for completed goal styling
6. Test migration of existing goals

## Testing Strategy

**Yearly Goals Images:**
- Paste image into textarea - verify preview appears
- Paste multiple images - verify all display
- Click thumbnail - verify lightbox shows full-size
- Remove image - verify removed from array
- Save and reload - verify images persist
- Test with large images (performance)

**Weekly Goals Completion:**
- Check/uncheck goals - verify state updates
- Completed goals show strike-through
- Badge shows correct count (3/5)
- Save and reload - verify completion state persists
- Existing goals migrate automatically
- Add/remove goals works with new format

## Success Criteria

- ✅ Users can paste images into yearly goals (Ctrl+V)
- ✅ Images display as thumbnails with lightbox view
- ✅ Images persist across page reloads
- ✅ Weekly goals have checkboxes for completion
- ✅ Completed goals show strike-through
- ✅ Completion count displayed in badge
- ✅ Existing weekly goals migrate automatically
- ✅ No regressions in existing functionality

## Future Considerations

- Image optimization (resize/compress before save)
- Drag-and-drop for images
- Rich text editor for yearly goals (like task descriptions)
- Filter weekly goals by completion status
- Archive completed weekly goals
- Export goals with images to PDF
