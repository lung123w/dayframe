import { describe, it, expect } from 'vitest';
import { calculateCurrentStreak, calculateLongestStreak, formatTimeSpent, isDateApplicable } from '../utils/habits';

describe('calculateCurrentStreak', () => {
  const daily = { type: 'daily' };

  it('returns 0 when no entries', () => {
    expect(calculateCurrentStreak([], daily)).toBe(0);
  });

  it('returns 1 when only today is completed', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(calculateCurrentStreak([{ date: today }], daily)).toBe(1);
  });

  it('counts consecutive days backward from today', () => {
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push({ date: d.toISOString().slice(0, 10) });
    }
    expect(calculateCurrentStreak(dates, daily)).toBe(5);
  });

  it('stops at gaps for daily habits', () => {
    const today = new Date();
    const dates = [
      { date: today.toISOString().slice(0, 10) },
      { date: new Date(today.getTime() - 86400000).toISOString().slice(0, 10) },
      // gap: skip day -2
      { date: new Date(today.getTime() - 3 * 86400000).toISOString().slice(0, 10) },
    ];
    expect(calculateCurrentStreak(dates, daily)).toBe(2);
  });

  it('handles weekly streaks by timesPerWeek', () => {
    const freq = { type: 'weekly', timesPerWeek: 2 };
    const entries = [];
    const now = new Date();
    for (let week = 0; week < 3; week++) {
      for (let day = 0; day < 2; day++) {
        const d = new Date(now);
        d.setDate(now.getDate() - (week * 7 + day));
        entries.push({ date: d.toISOString().slice(0, 10) });
      }
    }
    const streak = calculateCurrentStreak(entries, freq);
    expect(streak).toBe(3);
  });
});

describe('calculateLongestStreak', () => {
  it('returns 0 for no entries', () => {
    expect(calculateLongestStreak([], { type: 'daily' })).toBe(0);
  });

  it('finds the longest consecutive run', () => {
    const entries = [];
    const base = new Date('2026-01-10');
    // 3-day streak
    for (let i = 0; i < 3; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      entries.push({ date: d.toISOString().slice(0, 10) });
    }
    // gap on Jan 13
    // 5-day streak
    for (let i = 0; i < 5; i++) {
      const d = new Date(base); d.setDate(base.getDate() + 4 + i);
      entries.push({ date: d.toISOString().slice(0, 10) });
    }
    expect(calculateLongestStreak(entries, { type: 'daily' })).toBe(5);
  });
});

describe('isDateApplicable', () => {
  it('returns true for any date with daily frequency', () => {
    const daily = { type: 'daily' };
    // Monday
    expect(isDateApplicable('2026-03-02', daily)).toBe(true);
    // Saturday
    expect(isDateApplicable('2026-03-07', daily)).toBe(true);
    // Sunday
    expect(isDateApplicable('2026-03-08', daily)).toBe(true);
  });

  it('returns true for Mon-Fri and false for Sat/Sun with weekdays [1,2,3,4,5]', () => {
    const weekdays = { type: 'weekdays', days: [1, 2, 3, 4, 5] };
    // 2026-03-02 = Monday (ISO day 1)
    expect(isDateApplicable('2026-03-02', weekdays)).toBe(true);
    // 2026-03-03 = Tuesday (ISO day 2)
    expect(isDateApplicable('2026-03-03', weekdays)).toBe(true);
    // 2026-03-04 = Wednesday (ISO day 3)
    expect(isDateApplicable('2026-03-04', weekdays)).toBe(true);
    // 2026-03-05 = Thursday (ISO day 4)
    expect(isDateApplicable('2026-03-05', weekdays)).toBe(true);
    // 2026-03-06 = Friday (ISO day 5)
    expect(isDateApplicable('2026-03-06', weekdays)).toBe(true);
    // 2026-03-07 = Saturday (ISO day 6)
    expect(isDateApplicable('2026-03-07', weekdays)).toBe(false);
    // 2026-03-08 = Sunday (ISO day 7)
    expect(isDateApplicable('2026-03-08', weekdays)).toBe(false);
  });

  it('returns true only for custom days with weekdays frequency', () => {
    // Mon, Wed, Fri
    const customDays = { type: 'weekdays', days: [1, 3, 5] };
    // 2026-03-02 = Monday (ISO day 1) - included
    expect(isDateApplicable('2026-03-02', customDays)).toBe(true);
    // 2026-03-03 = Tuesday (ISO day 2) - not included
    expect(isDateApplicable('2026-03-03', customDays)).toBe(false);
    // 2026-03-04 = Wednesday (ISO day 3) - included
    expect(isDateApplicable('2026-03-04', customDays)).toBe(true);
    // 2026-03-05 = Thursday (ISO day 4) - not included
    expect(isDateApplicable('2026-03-05', customDays)).toBe(false);
    // 2026-03-06 = Friday (ISO day 5) - included
    expect(isDateApplicable('2026-03-06', customDays)).toBe(true);
    // 2026-03-07 = Saturday (ISO day 6) - not included
    expect(isDateApplicable('2026-03-07', customDays)).toBe(false);
    // 2026-03-08 = Sunday (ISO day 7) - not included
    expect(isDateApplicable('2026-03-08', customDays)).toBe(false);
  });

  it('returns true for any date with weekly frequency', () => {
    const weekly = { type: 'weekly', timesPerWeek: 3 };
    // Monday
    expect(isDateApplicable('2026-03-02', weekly)).toBe(true);
    // Saturday
    expect(isDateApplicable('2026-03-07', weekly)).toBe(true);
    // Sunday
    expect(isDateApplicable('2026-03-08', weekly)).toBe(true);
  });
});

describe('formatTimeSpent', () => {
  it('formats seconds into readable string', () => {
    expect(formatTimeSpent(0)).toBe('0m');
    expect(formatTimeSpent(60)).toBe('1m');
    expect(formatTimeSpent(3600)).toBe('1h 0m');
    expect(formatTimeSpent(3661)).toBe('1h 1m');
    expect(formatTimeSpent(90)).toBe('1m');
  });
});
