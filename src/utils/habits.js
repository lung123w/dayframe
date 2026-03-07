import { format, subDays, startOfWeek, differenceInCalendarDays, getDay, parseISO, addDays } from 'date-fns';

/**
 * Check if a date is applicable for a given frequency type.
 * For 'weekdays' frequency, only Mon-Fri are applicable.
 * For 'daily', all days are applicable.
 * For 'weekly', all days are applicable (checked at week level).
 *
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @param {{ type: string }} frequency - frequency object
 * @returns {boolean}
 */
export function isDateApplicable(dateStr, frequency) {
  if (!frequency || frequency.type === 'daily' || frequency.type === 'weekly') {
    return true;
  }

  if (frequency.type === 'weekdays') {
    const day = getDay(parseISO(dateStr));
    // 0 = Sunday, 6 = Saturday
    return day >= 1 && day <= 5;
  }

  return true;
}

/**
 * Calculate the current streak for a habit.
 *
 * - Daily: count consecutive days backward from today (or yesterday if today not done)
 * - Weekdays: skip non-applicable days without breaking chain
 * - Weekly: count consecutive weeks where entries >= timesPerWeek
 *
 * @param {{ date: string }[]} entries - array of completion entries with date as YYYY-MM-DD
 * @param {{ type: string, timesPerWeek?: number }} frequency
 * @returns {number} current streak count
 */
export function calculateCurrentStreak(entries, frequency) {
  if (!entries || entries.length === 0) return 0;

  if (frequency.type === 'weekly') {
    return calculateWeeklyStreak(entries, frequency);
  }

  // Build a Set of completed date strings for O(1) lookup
  const dateSet = new Set(entries.map(e => e.date));
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  let streak = 0;
  let checkDate = today;

  // If today is not completed, start from yesterday
  if (!dateSet.has(todayStr)) {
    checkDate = subDays(today, 1);
    // For weekdays, skip back to last applicable day
    if (frequency.type === 'weekdays') {
      while (!isDateApplicable(format(checkDate, 'yyyy-MM-dd'), frequency)) {
        checkDate = subDays(checkDate, 1);
      }
    }
  }

  // Count consecutive days backward
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');

    // For weekdays frequency, skip non-applicable days
    if (frequency.type === 'weekdays' && !isDateApplicable(dateStr, frequency)) {
      checkDate = subDays(checkDate, 1);
      continue;
    }

    if (dateSet.has(dateStr)) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate weekly streak: consecutive weeks where entries >= timesPerWeek.
 * Weeks start on Monday (ISO standard).
 */
function calculateWeeklyStreak(entries, frequency) {
  if (!entries || entries.length === 0) return 0;

  const timesPerWeek = frequency.timesPerWeek || 1;

  // Group entries by ISO week (Monday start)
  const weekMap = new Map();
  for (const entry of entries) {
    const date = parseISO(entry.date);
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + 1);
  }

  // Sort weeks descending (most recent first)
  const sortedWeeks = [...weekMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]));

  if (sortedWeeks.length === 0) return 0;

  // Check that the most recent week with entries is current or last week
  const now = new Date();
  const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const lastWeekStart = format(startOfWeek(subDays(now, 7), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const mostRecentWeek = sortedWeeks[0][0];
  if (mostRecentWeek !== currentWeekStart && mostRecentWeek !== lastWeekStart) {
    return 0;
  }

  let streak = 0;
  let expectedWeekStart = mostRecentWeek;

  for (const [weekStart, count] of sortedWeeks) {
    if (weekStart !== expectedWeekStart) break;
    if (count >= timesPerWeek) {
      streak++;
    } else {
      break;
    }
    // Move to previous week
    expectedWeekStart = format(
      startOfWeek(subDays(parseISO(expectedWeekStart), 1), { weekStartsOn: 1 }),
      'yyyy-MM-dd'
    );
  }

  return streak;
}

/**
 * Calculate the longest streak ever for a habit.
 *
 * For daily: scan all sorted entries for maximum consecutive day run.
 * For weekly: scan all weeks for maximum consecutive weeks meeting threshold.
 *
 * @param {{ date: string }[]} entries
 * @param {{ type: string, timesPerWeek?: number }} frequency
 * @returns {number}
 */
export function calculateLongestStreak(entries, frequency) {
  if (!entries || entries.length === 0) return 0;

  if (frequency.type === 'weekly') {
    return calculateLongestWeeklyStreak(entries, frequency);
  }

  // Sort entries by date ascending and deduplicate
  const uniqueDates = [...new Set(entries.map(e => e.date))].sort();

  if (uniqueDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = parseISO(uniqueDates[i - 1]);
    const curr = parseISO(uniqueDates[i]);
    const diff = differenceInCalendarDays(curr, prev);

    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else if (diff === 0) {
      // duplicate date, skip
      continue;
    } else {
      // For weekdays, check if the gap is only weekends
      if (frequency.type === 'weekdays') {
        let allNonApplicable = true;
        let checkDate = addDays(prev, 1);
        while (differenceInCalendarDays(curr, checkDate) > 0) {
          if (isDateApplicable(format(checkDate, 'yyyy-MM-dd'), frequency)) {
            allNonApplicable = false;
            break;
          }
          checkDate = addDays(checkDate, 1);
        }
        if (allNonApplicable) {
          current++;
          if (current > longest) longest = current;
          continue;
        }
      }
      current = 1;
    }
  }

  return longest;
}

/**
 * Calculate longest weekly streak.
 */
function calculateLongestWeeklyStreak(entries, frequency) {
  const timesPerWeek = frequency.timesPerWeek || 1;

  // Group by ISO week
  const weekMap = new Map();
  for (const entry of entries) {
    const date = parseISO(entry.date);
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + 1);
  }

  // Get qualifying weeks sorted ascending
  const qualifyingWeeks = [...weekMap.entries()]
    .filter(([, count]) => count >= timesPerWeek)
    .map(([weekStart]) => weekStart)
    .sort();

  if (qualifyingWeeks.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < qualifyingWeeks.length; i++) {
    const prev = parseISO(qualifyingWeeks[i - 1]);
    const curr = parseISO(qualifyingWeeks[i]);
    const diff = differenceInCalendarDays(curr, prev);

    if (diff === 7) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

/**
 * Format total seconds into a readable string like "1h 5m" or "0m".
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTimeSpent(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
