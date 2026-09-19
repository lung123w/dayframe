# daily-planning-session Specification (Delta)

## REMOVED Requirements

### Requirement: User can open a daily planning session
**Reason**: The "Plan My Day" button and its `DailyPlanningModal` are removed as an approved simplification (2026-09-13). Planning the day is done directly in the Today view, which already provides the same capabilities (quick-capture, Daily Workflow, drag/arrow reordering). The button had no other entry points — no keyboard shortcut and no sidebar item existed.
**Migration**: Use the Today view to plan the day: capture tasks with the quick-capture bar, work through the Daily Workflow section, and reorder today's tasks with drag-and-drop or arrow keys. Today-view ordering already persists to the same `todayOrder` setting the modal used to write.

### Requirement: User selects tasks to include in Today
**Reason**: The planning modal was one writer of `todayOrder`; it is removed. The Today view and the DailyPlanner's today column remain the direct way to include and order tasks for today, and both are unaffected.
**Migration**: Reorder tasks directly in the Today view (drag / arrow keys) or in the Planner's today column — both persist via `handleTodayOrderChange` → `syncTodayOrder`. An empty `todayOrder` falls back to all pending tasks in due-date order, so no set-up is required.

### Requirement: Daily planning session is accessible from the Today view
**Reason**: The "Plan My Day" button (visible in the header on every view) is removed, along with the planning modal. The quick-capture bar and Daily Workflow section remain persistent parts of the Today view — those behaviors were never unique to this capability and are fully specified by separate capabilities.
**Migration**: There is no button to open; navigate to the Today view via the sidebar "Today" item. Quick-capture and Daily Workflow continue to work unchanged (see `today-quick-capture` and `daily-workflow-session`).