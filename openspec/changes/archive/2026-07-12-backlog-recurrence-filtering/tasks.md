## 1. Recurrence helper

- [x] 1.1 Add `getNextOccurrenceFrom(task, fromDate)` to `src/utils/recurrence.js`. It walks the pattern from `task.dueDate` forward, returning the first occurrence whose local date is `>= fromDate`, or `null` if the pattern has ended or the safety cap is hit.
- [x] 1.2 Add unit tests in `src/__tests__/recurrence.test.js` covering: daily future, daily overdue, weekly with `daysOfWeek`, monthly, ended pattern (end date in past), and the safety-cap behavior.

## 2. Backlog filter

- [x] 2.1 Update `src/components/BacklogSidebar.jsx` so the "Unscheduled" branch excludes recurring source tasks whose `getNextOccurrenceFrom(task, today)` is `null` or whose local date is `>= today`. The "All Pending" branch is unchanged.
- [x] 2.2 Add `src/__tests__/BacklogSidebar.test.jsx` covering: future daily source hidden, overdue daily source shown with badge, weekly source with future instance hidden, ended recurring source hidden, non-recurring future task hidden, non-recurring overdue task shown, "All Pending" view shows everything, search within "Unscheduled" skips hidden recurring sources.

## 3. Verification

- [x] 3.1 Run `npm run lint` and `npm run test:run`. Both must pass.
