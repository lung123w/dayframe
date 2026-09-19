# monthly-review-reminder Specification

## Purpose
TBD - created by archiving change monthly-financial-review. Update Purpose after archive.

## ADDED Requirements

### Requirement: A recurring task reminds the user on the last Saturday of each month

The system MUST create a recurring task titled "Monthly Financial Review" that fires on the last Saturday of every month at 09:00 local time, with `priority: "high"`. The task MUST be created on first use of the Finance feature and MUST persist in the `tasks` table alongside regular tasks. Its recurrence pattern MUST be monthly, anchored to the last Saturday, with no end date.

#### Scenario: First Finance access creates the recurring task
- **WHEN** the user opens the Finance view for the first time and no "Monthly Financial Review" task exists
- **THEN** a recurring task is created with `recurrence.pattern: "monthly"`, `recurrence.weekday: "SA"`, `recurrence.weekOfMonth: "last"`, `recurrence.hour: 9`, `recurrence.minute: 0`, and `priority: "high"`

#### Scenario: Recurring task is not duplicated on subsequent accesses
- **WHEN** the user opens the Finance view and a "Monthly Financial Review" task already exists
- **THEN** no new recurring task is created

#### Scenario: Recurring task generates one instance per month
- **WHEN** the calendar view loads for a future month
- **THEN** exactly one "Monthly Financial Review" event is shown, dated on the last Saturday of that month

### Requirement: Clicking the reminder opens the Finance view

When the user clicks the recurring "Monthly Financial Review" task in the calendar or backlog, the Finance view MUST open with that month's review selected. If no review exists for that month yet, the system MUST create one before navigation.

#### Scenario: Clicking the reminder for the current month
- **WHEN** the user clicks the "Monthly Financial Review" task for the current month
- **THEN** the Finance view opens and shows the current month's review (creating it first if it does not exist)

#### Scenario: Clicking the reminder for a past month
- **WHEN** the user clicks the reminder for a past month that already has a completed review
- **THEN** the Finance view opens in read-only mode showing that past review

### Requirement: Reminder triggers a browser notification

When the system detects a due "Monthly Financial Review" instance, it MUST emit a browser notification (via the existing `notifications.js` service) with the title "Monthly Financial Review" and body "It's time to do this month's financial review." The notification MUST use the same polling mechanism that already powers task notifications and MUST respect the user's existing notification preferences.

#### Scenario: Notification fires on the last Saturday at 09:00
- **WHEN** the current local time crosses 09:00 on the last Saturday of a month and the reminder for that month is still pending
- **THEN** a browser notification is shown with the title and body specified above

#### Scenario: No duplicate notification for the same month
- **WHEN** the user marks the recurring instance complete
- **THEN** no further notification is shown for that month's review until the next month
