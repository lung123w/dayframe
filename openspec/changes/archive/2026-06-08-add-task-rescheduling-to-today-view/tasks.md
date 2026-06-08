# Implementation Tasks

## Task 1: Create DeferPopover Component

Create `src/components/DeferPopover.jsx`:

- [x] Create component with props: `task`, `onDefer`, `onClose`
- [x] Add quick option buttons: Tomorrow, Next Week, Next Month, Someday
- [x] Add native date input for custom date selection
- [x] Style as a small popover that appears below the trigger button
- [x] Handle click-outside to close
- [x] Use date-fns for date calculations (addDays, addWeeks, addMonths)

## Task 2: Add Defer Button to TodayView

Modify `src/components/TodayView.jsx`:

- [x] Import `FaCalendarAlt` from react-icons/fa
- [x] Import `DeferPopover` component
- [x] Add `deferTaskId` state with `useState(null)`
- [x] Add `handleDefer` callback that updates task's dueDate and calls onDataChange
- [x] Add Defer button to `renderTaskCard` for pending (non-completed) tasks
- [x] Button should only show on hover (like Edit button)
- [x] Clicking button sets `deferTaskId` to task's key
- [x] Render `DeferPopover` when `deferTaskId` matches current task

## Task 3: Add Styles

Modify `src/components/TodayView.css`:

- [x] Add `.tv-defer-btn` styles (similar to `.tv-edit-btn`)
- [x] Add `.tv-defer-popover` styles for the popover container
- [x] Add `.tv-defer-quick-options` styles for quick option buttons
- [x] Add `.tv-defer-date-input` styles for the date picker
- [x] Ensure popover has proper z-index and positioning

## Task 4: Testing

- [x] Test defer to tomorrow
- [x] Test defer to next week
- [x] Test defer to next month
- [x] Test defer to custom date
- [x] Test defer to someday (null date)
- [x] Test popover closes on outside click
- [x] Test only one popover open at a time
- [x] Run `npm run lint` to check for code issues
- [x] Run `npm run test:run` to ensure no regressions
