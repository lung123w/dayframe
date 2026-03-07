import { describe, it, expect } from 'vitest';
import { calculateCurrentStreak, calculateLongestStreak, formatTimeSpent } from '../utils/habits';

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
    expect(streak).toBeGreaterThanOrEqual(1);
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

describe('formatTimeSpent', () => {
  it('formats seconds into readable string', () => {
    expect(formatTimeSpent(0)).toBe('0m');
    expect(formatTimeSpent(60)).toBe('1m');
    expect(formatTimeSpent(3600)).toBe('1h 0m');
    expect(formatTimeSpent(3661)).toBe('1h 1m');
    expect(formatTimeSpent(90)).toBe('1m');
  });
});
