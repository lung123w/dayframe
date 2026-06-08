# Add Task Rescheduling to Today View

## Problem

Users cannot move/reschedule tasks from the Today View to a different date. Currently, the Today View only supports:
- Reordering tasks within the "Today" section (drag-and-drop or up/down buttons)
- Dragging **overdue** tasks to the "Today" section to reschedule them to today

However, there is no way to move a task that is due today to a different date without opening the edit modal.

## Solution

Add the ability to drag tasks from the Today View to a date selector or drop zone that allows rescheduling to a different date. This provides a quick way to defer tasks without opening the full edit modal.

## Benefits

- Faster task management - defer tasks with a simple drag
- Reduced friction - no need to open edit modal just to change the date
- Consistent with drag-and-drop patterns used elsewhere in the app (BacklogSidebar → DailyPlanner, DayColumn → DayColumn)
