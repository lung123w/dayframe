import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter } from 'date-fns';

/**
 * Resolve the effective status for a single recurring instance.
 *
 * Priority order:
 *   1. Exact per-instance override in statusOverrides[instanceDate]
 *   2. The most recent "from date" override where fromDate <= instanceDate
 *   3. The task's base status
 */
export function resolveInstanceStatus(task, instanceDateStr) {
  // 1. Exact per-instance override
  const overrides = task.statusOverrides || {};
  if (overrides[instanceDateStr]) {
    return overrides[instanceDateStr];
  }

  // 2. "This and all future" overrides — find the latest one that applies
  const fromOverrides = task.statusFromOverrides || [];
  if (fromOverrides.length > 0) {
    const instanceTime = new Date(instanceDateStr).getTime();
    let bestOverride = null;
    for (const entry of fromOverrides) {
      const fromTime = new Date(entry.fromDate).getTime();
      if (fromTime <= instanceTime) {
        if (!bestOverride || fromTime > new Date(bestOverride.fromDate).getTime()) {
          bestOverride = entry;
        }
      }
    }
    if (bestOverride) {
      return bestOverride.status;
    }
  }

  // 3. Fall back to the task's base status
  return task.status;
}

/**
 * Recurrence pattern structure:
 * {
 *   type: 'daily' | 'weekly' | 'monthly' | 'yearly',
 *   interval: number (e.g., 1 for every day, 2 for every other day),
 *   daysOfWeek: [0-6] (for weekly, 0=Sunday, 6=Saturday),
 *   dayOfMonth: number (for monthly),
 *   endDate: Date | null,
 *   endAfterOccurrences: number | null
 * }
 */

function toLocalDateStr(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Return the second occurrence of a recurring task (one step after the first
 * instance / `task.dueDate`). The caller compares the returned date with the
 * `fromDate` reference to decide if the source is "behind" (returned date is
 * strictly before `fromDate`) or "on schedule" (returned date is `fromDate` or
 * later). Returns null when the pattern has already ended by `fromDate`
 * (endDate is strictly before `fromDate`), when the second occurrence is past
 * `endDate`, or when `endAfterOccurrences` limits the pattern to one or zero
 * instances.
 *
 * @param {{ isRecurring?: boolean, dueDate?: string|Date, recurrencePattern?: object }} task
 * @param {Date|string} fromDate The reference date (typically "today"). Used
 *   to decide whether the pattern has already ended from the caller's
 *   perspective.
 * @returns {Date|null}
 */
export function getNextOccurrenceFrom(task, fromDate) {
  if (!task || !task.isRecurring || !task.recurrencePattern || !task.dueDate || !fromDate) {
    return null;
  }

  const pattern = task.recurrencePattern;
  const startDate = new Date(task.dueDate);
  const endDate = pattern.endDate ? new Date(pattern.endDate) : null;
  const fromLocal = toLocalDateStr(fromDate);

  if (endDate && toLocalDateStr(endDate) < fromLocal) {
    return null;
  }

  if (pattern.endAfterOccurrences && pattern.endAfterOccurrences <= 1) {
    return null;
  }

  const second = getNextOccurrence(startDate, pattern);

  if (endDate && toLocalDateStr(second) > toLocalDateStr(endDate)) {
    return null;
  }

  return second;
}

export function generateRecurringTasks(task, startDate, endDate) {
  if (!task.isRecurring || !task.recurrencePattern) {
    return [task];
  }

  const tasks = [];
  const pattern = task.recurrencePattern;
  const maxOccurrences = pattern.endAfterOccurrences || 500; // Safety limit

  // Fast-forward from task.dueDate to the first occurrence that is >= startDate,
  // so we never miss visible instances when the base date is far in the past.
  let currentDate = new Date(task.dueDate);
  let occurrenceCount = 0;

  while (isBefore(currentDate, startDate) && occurrenceCount < maxOccurrences) {
    if (pattern.endDate && isAfter(currentDate, new Date(pattern.endDate))) break;
    currentDate = getNextOccurrence(currentDate, pattern);
    occurrenceCount++;
  }

  // Now emit all instances within [startDate, endDate)
  while (isBefore(currentDate, endDate) && occurrenceCount < maxOccurrences) {
    if (pattern.endDate && isAfter(currentDate, new Date(pattern.endDate))) break;

    const instanceDateStr = currentDate.toISOString();
    const resolvedStatus = resolveInstanceStatus(task, instanceDateStr);

    tasks.push({
      ...task,
      dueDate: instanceDateStr,
      status: resolvedStatus,
      isRecurringInstance: true,
      recurringSourceId: task.id,
      instanceDate: instanceDateStr
    });

    currentDate = getNextOccurrence(currentDate, pattern);
    occurrenceCount++;
  }

  return tasks;
}

function getNextOccurrence(currentDate, pattern) {
  const { type, interval = 1 } = pattern;

  switch (type) {
    case 'daily':
      return addDays(currentDate, interval);

    case 'weekly':
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        return getNextWeeklyOccurrence(currentDate, pattern.daysOfWeek, interval);
      }
      return addWeeks(currentDate, interval);

    case 'monthly':
      return addMonths(currentDate, interval);

    case 'yearly':
      return addYears(currentDate, interval);

    default:
      return addDays(currentDate, 1);
  }
}

function getNextWeeklyOccurrence(currentDate, daysOfWeek, interval) {
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
  const currentDay = currentDate.getDay();
  
  // Find next day in the same week
  const nextDayInWeek = sortedDays.find(day => day > currentDay);
  
  if (nextDayInWeek !== undefined) {
    // Next occurrence is in the same week
    const daysToAdd = nextDayInWeek - currentDay;
    return addDays(currentDate, daysToAdd);
  } else {
    // Move to next week(s) and use first day
    const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
    const weeksToAdd = interval - 1;
    return addDays(currentDate, daysUntilNextWeek + (weeksToAdd * 7));
  }
}

export function isRecurringPatternValid(pattern) {
  if (!pattern || !pattern.type) return false;

  const validTypes = ['daily', 'weekly', 'monthly', 'yearly'];
  if (!validTypes.includes(pattern.type)) return false;

  if (pattern.interval !== undefined && pattern.interval < 1) return false;

  if (pattern.type === 'weekly' && pattern.daysOfWeek) {
    if (!Array.isArray(pattern.daysOfWeek) || pattern.daysOfWeek.length === 0) {
      return false;
    }
    if (pattern.daysOfWeek.some(day => day < 0 || day > 6)) {
      return false;
    }
  }

  return true;
}

export function getRecurrenceDescription(pattern) {
  if (!pattern) return 'Does not repeat';

  const { type, interval = 1, daysOfWeek, endDate, endAfterOccurrences } = pattern;

  let description = '';

  // Frequency
  if (interval === 1) {
    description = {
      daily: 'Every day',
      weekly: 'Every week',
      monthly: 'Every month',
      yearly: 'Every year'
    }[type];
  } else {
    description = {
      daily: `Every ${interval} days`,
      weekly: `Every ${interval} weeks`,
      monthly: `Every ${interval} months`,
      yearly: `Every ${interval} years`
    }[type];
  }

  // Days of week for weekly recurrence
  if (type === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const selectedDays = daysOfWeek.map(d => dayNames[d]).join(', ');
    description += ` on ${selectedDays}`;
  }

  // End condition
  if (endDate) {
    const date = new Date(endDate);
    description += ` until ${date.toLocaleDateString()}`;
  } else if (endAfterOccurrences) {
    description += ` for ${endAfterOccurrences} occurrences`;
  }

  return description;
}
