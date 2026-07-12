import { describe, it, expect } from 'vitest';
import { calculateCurrentStreak, calculateLongestStreak, formatTimeSpent, isDateApplicable, formatCount, getEntryValue, getEntryUnit, getTrackType } from '../utils/habits';

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

describe('getTrackType', () => {
  it('returns the habit trackType when set', () => {
    expect(getTrackType({ trackType: 'count' })).toBe('count');
    expect(getTrackType({ trackType: 'duration' })).toBe('duration');
  });

  it('defaults to duration for habits without trackType (legacy)', () => {
    expect(getTrackType({})).toBe('duration');
    expect(getTrackType({ name: 'Read' })).toBe('duration');
  });

  it('defaults to duration for null/undefined habit', () => {
    expect(getTrackType(null)).toBe('duration');
    expect(getTrackType(undefined)).toBe('duration');
  });
});

describe('formatCount', () => {
  it('uses singular form for 1', () => {
    expect(formatCount(1)).toBe('1 rep');
  });

  it('uses plural form for other positive integers', () => {
    expect(formatCount(2)).toBe('2 reps');
    expect(formatCount(20)).toBe('20 reps');
    expect(formatCount(130)).toBe('130 reps');
  });

  it('returns "0 reps" for zero or negative values', () => {
    expect(formatCount(0)).toBe('0 reps');
    expect(formatCount(-3)).toBe('0 reps');
  });

  it('handles non-numeric input safely', () => {
    expect(formatCount(NaN)).toBe('0 reps');
    expect(formatCount(undefined)).toBe('0 reps');
    expect(formatCount(null)).toBe('0 reps');
  });
});

describe('getEntryValue', () => {
  it('returns entry.count for a count habit', () => {
    expect(getEntryValue({ count: 20 }, { trackType: 'count' })).toBe(20);
  });

  it('returns entry.timeSpentSeconds for a duration habit', () => {
    expect(getEntryValue({ timeSpentSeconds: 900 }, { trackType: 'duration' })).toBe(900);
  });

  it('defaults to duration for legacy habits without trackType', () => {
    expect(getEntryValue({ timeSpentSeconds: 300 }, {})).toBe(300);
    expect(getEntryValue({ count: 5 }, {})).toBe(0);
  });

  it('returns 0 for missing or null entries', () => {
    expect(getEntryValue(null, { trackType: 'count' })).toBe(0);
    expect(getEntryValue(undefined, { trackType: 'duration' })).toBe(0);
  });

  it('returns 0 when the relevant field is missing', () => {
    expect(getEntryValue({}, { trackType: 'count' })).toBe(0);
    expect(getEntryValue({}, { trackType: 'duration' })).toBe(0);
  });
});

describe('getEntryUnit', () => {
  it('returns "reps" for count habits', () => {
    expect(getEntryUnit({ trackType: 'count' })).toBe('reps');
  });

  it('returns "minutes" for duration habits', () => {
    expect(getEntryUnit({ trackType: 'duration' })).toBe('minutes');
  });

  it('returns "minutes" for legacy habits without trackType', () => {
    expect(getEntryUnit({})).toBe('minutes');
    expect(getEntryUnit({ name: 'Meditate' })).toBe('minutes');
  });
});
