# Design: Add Task Rescheduling to Today View

## Approach

Add a "Defer" button to each task card in the Today View that opens a quick date picker popover. When a date is selected, the task's due date is updated and the task is removed from the Today View.

### Why a button instead of drag-to-date?

1. **Simplicity**: A button + popover is easier to implement and more discoverable than drag-to-edge-or-zone
2. **Precision**: Users can pick an exact date from a calendar picker
3. **Mobile-friendly**: Works well on touch devices where drag-and-drop can be tricky
4. **Consistent pattern**: Similar to how Outlook/other task apps handle deferring

## UI Design

### Task Card Changes

Add a "Defer" button (calendar icon) to each pending task card in the Today section:

```
[Status] [Task Title] [Project] [High] [↑↓] [Edit] [Defer]
```

The Defer button:
- Shows a calendar icon (`FaCalendarAlt`)
- Only visible on hover (like the Edit button)
- Opens a small date picker popover on click

### Date Picker Popover

A small popover that appears below the Defer button with:
- A mini calendar for date selection (using native `<input type="date">` or a simple calendar grid)
- Quick options: "Tomorrow", "Next Week", "Next Month", "Someday" (no date)
- Cancel button

### Behavior

1. User clicks Defer button
2. Date picker popover appears
3. User selects a date or quick option
4. Task's `dueDate` is updated via `taskService.update()`
5. Task is removed from Today View (data reloads via `onDataChange`)
6. If "Someday" is selected, `dueDate` is set to `null`

## Technical Details

### New Component: `DeferPopover.jsx`

A small popover component that handles date selection:

```jsx
<DeferPopover
  task={task}
  onDefer={(newDate) => handleDefer(task, newDate)}
  onClose={() => setDeferTaskId(null)}
/>
```

### Handler in TodayView.jsx

```js
const handleDefer = useCallback(async (task, newDate) => {
  await taskService.update(task.id, { dueDate: newDate });
  if (onDataChange) onDataChange();
  setDeferTaskId(null);
}, [onDataChange]);
```

### State Management

- `deferTaskId` state tracks which task's popover is open
- Only one popover can be open at a time
- Popover closes when clicking outside or selecting a date

## Files to Modify

1. `src/components/TodayView.jsx` - Add Defer button and handler
2. `src/components/DeferPopover.jsx` - New component for date picker
3. `src/components/TodayView.css` - Add styles for Defer button and popover

## Dependencies

- `date-fns` for date formatting and calculations (already in project)
- `react-icons/fa` for calendar icon (already in project)
