import { lastDayOfMonth, getDay, subDays, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

/**
 * Return the last Saturday of the given month as a Date (local time, 00:00:00).
 * Uses date-fns lastDayOfMonth then walks back to the most recent Saturday (getDay() === 6).
 *
 * @param {number} year  - full year, e.g. 2026
 * @param {number} month - 0-indexed month (0 = Jan, 11 = Dec)
 * @returns {Date}
 */
export function getLastSaturdayOfMonth(year, month) {
  const lastDay = lastDayOfMonth(new Date(year, month, 1));
  const dayOfWeek = getDay(lastDay);
  // getDay: 0 = Sun, 6 = Sat
  const back = (dayOfWeek + 1) % 7; // days to go back to reach Saturday (Sat→0, Sun→1, Mon→2, ...)
  return subDays(lastDay, back);
}

/**
 * Format a Date as a YYYY-MM-DD monthKey.
 * @param {Date} [date=new Date()]
 */
export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Combine a date and (hour, minute) into a single Date, preserving local time.
 * @param {Date} date
 * @param {number} hour
 * @param {number} minute
 */
export function setTimeOnDate(date, hour, minute) {
  let d = setHours(date, hour);
  d = setMinutes(d, minute);
  d = setSeconds(d, 0);
  d = setMilliseconds(d, 0);
  return d;
}
