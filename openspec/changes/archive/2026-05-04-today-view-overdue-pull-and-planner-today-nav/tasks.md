## 1. Overdue Pull-to-Today (TodayView)

- [x] 1.1 Add `onDataChange` prop (or verify it's already available) to `TodayView.jsx` for triggering a data reload after bulk update
- [x] 1.2 Implement `handlePullToToday` async handler in `TodayView.jsx` that calls `taskService.update(id, { dueDate: today })` for each overdue task via `Promise.all`
- [x] 1.3 Add "Pull to today" button inside the `tv-section-header--overdue` div, wired to `handlePullToToday`
- [x] 1.4 Style the button to fit the section header (small, secondary style consistent with existing header buttons)

## 2. Planner Today Navigation (MiniWeekBar)

- [x] 2.1 Add `onGoToToday` prop to `MiniWeekBar` component signature
- [x] 2.2 Add a "Today" button element in the `mini-week-nav` row (between or alongside the prev/next arrows)
- [x] 2.3 Wire the "Today" button's `onClick` to `onGoToToday`
- [x] 2.4 Style the "Today" button to be compact and visually distinct but not dominant (e.g., small text button or pill)
- [x] 2.5 In `DailyPlanner.jsx`, implement `handleGoToToday` that resets `weekStartDate` to `startOfWeek(new Date(), { weekStartsOn: 1 })`
- [x] 2.6 Pass `onGoToToday={handleGoToToday}` to `<MiniWeekBar>` in `DailyPlanner.jsx`
