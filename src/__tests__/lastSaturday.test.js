import { describe, it, expect } from 'vitest';
import { getLastSaturdayOfMonth, currentMonthKey, setTimeOnDate } from '../utils/lastSaturday';

describe('getLastSaturdayOfMonth', () => {
  it('returns the last Saturday for a month ending on Saturday', () => {
    // August 2026: last day is Aug 31, which is a Monday. Last Saturday is Aug 29.
    const result = getLastSaturdayOfMonth(2026, 7);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(29);
    expect(result.getDay()).toBe(6); // Saturday
  });

  it('returns the last Saturday when the last day is a Saturday', () => {
    // October 2026: last day is Oct 31, which is a Saturday. Last Saturday is Oct 31.
    const result = getLastSaturdayOfMonth(2026, 9);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(9);
    expect(result.getDate()).toBe(31);
    expect(result.getDay()).toBe(6);
  });

  it('handles February in a leap year', () => {
    // February 2024 (leap): last day is Feb 29, a Thursday. Last Saturday is Feb 24.
    const result = getLastSaturdayOfMonth(2024, 1);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(24);
    expect(result.getDay()).toBe(6);
  });

  it('handles February in a non-leap year', () => {
    // February 2026: last day is Feb 28, a Saturday. Last Saturday is Feb 28.
    const result = getLastSaturdayOfMonth(2026, 1);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
    expect(result.getDay()).toBe(6);
  });

  it('handles December', () => {
    // December 2026: last day is Dec 31, a Thursday. Last Saturday is Dec 26.
    const result = getLastSaturdayOfMonth(2026, 11);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(26);
    expect(result.getDay()).toBe(6);
  });

  it('handles a month that starts on a Saturday', () => {
    // August 2026: 1st is a Saturday, but we want the LAST Saturday → Aug 29
    const result = getLastSaturdayOfMonth(2026, 7);
    expect(result.getDate()).toBe(29);
  });

  it('returns a date with time 00:00:00.000', () => {
    const result = getLastSaturdayOfMonth(2026, 6);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('currentMonthKey', () => {
  it('formats a date as YYYY-MM', () => {
    expect(currentMonthKey(new Date(2026, 0, 1))).toBe('2026-01');
    expect(currentMonthKey(new Date(2026, 8, 15))).toBe('2026-09');
    expect(currentMonthKey(new Date(2026, 11, 31))).toBe('2026-12');
  });

  it('uses the current date when called with no argument', () => {
    const result = currentMonthKey();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('setTimeOnDate', () => {
  it('applies hour and minute to a date', () => {
    const result = setTimeOnDate(new Date(2026, 5, 15), 9, 30);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});
