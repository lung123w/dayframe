import { getLastSaturdayOfMonth, currentMonthKey, setTimeOnDate } from './lastSaturday.js';

const REMINDER_TITLE = 'Monthly Financial Review';

/**
 * Idempotently ensure the recurring "Monthly Financial Review" task exists.
 *
 * - If a task with the exact title already exists, this is a no-op.
 * - Otherwise, create a recurring monthly task anchored to the last Saturday
 *   of each month at 09:00 local time, with high priority.
 * - The initial dueDate is the next occurrence of last-Saturday at 09:00.
 *
 * @param {{ getAll: Function, create: Function }} taskService
 * @returns {Promise<{created: boolean, task: object | null}>}
 */
export async function ensureMonthlyReviewReminder(taskService) {
  const tasks = await taskService.getAll();
  const existing = tasks.find(t => t.title === REMINDER_TITLE);
  if (existing) {
    return { created: false, task: existing };
  }

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  // Use the last Saturday of the current month; if it has already passed at 09:00,
  // advance to next month's last Saturday.
  let reviewDate = getLastSaturdayOfMonth(year, month);
  let dueDate = setTimeOnDate(reviewDate, 9, 0);
  if (dueDate.getTime() < now.getTime()) {
    const next = new Date(year, month + 1, 1);
    year = next.getFullYear();
    month = next.getMonth();
    reviewDate = getLastSaturdayOfMonth(year, month);
    dueDate = setTimeOnDate(reviewDate, 9, 0);
  }

  const created = await taskService.create({
    title: REMINDER_TITLE,
    description: 'Open the Finance view to complete this month\u2019s review checklist and per-card tracking.',
    dueDate: dueDate.toISOString(),
    priority: 'high',
    status: 'pending',
    isRecurring: true,
    recurrencePattern: {
      type: 'monthly',
      weekOfMonth: 'last',
      dayOfWeek: 6,
      hour: 9,
      minute: 0,
    },
  });

  return { created: true, task: created };
}

export { REMINDER_TITLE };
export { currentMonthKey };
