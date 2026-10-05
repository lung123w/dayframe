import { describe, it, expect } from 'vitest';
import {
  SETTINGS_KEY,
  VIEW_ORDER,
  VIEW_META,
  ALL_VIEWS,
  normalizeVisibleViews,
  isViewVisible,
  firstVisibleView,
  visibleGotoKeys,
} from '../components/viewVisibility';
import { buildShortcuts, SHORTCUTS, GOTO_VIEWS } from '../components/keyboard';

/**
 * The pure half of `view-visibility-configuration` (design.md D4/D11).
 * The normalizer's table is asserted row by row; the `buildShortcuts(ALL_VIEWS)`
 * identity is what keeps the existing palette-footer test passing unmodified.
 */

describe('viewVisibility — the catalogue', () => {
  it('owns the key, the canonical order and the six ids', () => {
    expect(SETTINGS_KEY).toBe('ui.visibleViews');
    expect(VIEW_ORDER).toEqual(['today', 'planner', 'habits', 'review', 'finance', 'projects']);
    expect(ALL_VIEWS).toEqual(VIEW_ORDER);
    expect(Object.keys(VIEW_META)).toEqual(VIEW_ORDER);
  });

  it('reproduces the shipped labels, goto letters, commands and aria labels', () => {
    expect(VIEW_META.today).toEqual({ label: 'Today', goto: 't', command: 'Go to Today', placement: 'strip', ariaLabel: 'Navigate to Today view' });
    expect(VIEW_META.planner).toEqual({ label: 'Week', goto: 'w', command: 'Go to Week', placement: 'strip', ariaLabel: 'Navigate to Week view' });
    expect(VIEW_META.habits).toEqual({ label: 'Habits', goto: 'h', command: 'Go to Habits', placement: 'strip', ariaLabel: 'Navigate to Habits view' });
    expect(VIEW_META.review).toEqual({ label: 'Review', goto: 'r', command: 'Go to Review', placement: 'strip', ariaLabel: 'Navigate to Weekly Review view' });
    // The two More rows carry no ariaLabel: the item's accessible name is its text.
    expect(VIEW_META.finance).toEqual({ label: 'Finance', goto: 'f', command: 'Go to Finance', placement: 'more' });
    expect(VIEW_META.projects).toEqual({ label: 'Projects', goto: 'p', command: 'Go to Projects', placement: 'more' });
  });

  it('derives GOTO_VIEWS from the catalogue, public shape unchanged', () => {
    expect(GOTO_VIEWS).toEqual({ t: 'today', w: 'planner', h: 'habits', r: 'review', f: 'finance', p: 'projects' });
  });
});

describe('normalizeVisibleViews — the D4 table, row by row', () => {
  it('unset values are the fresh-install set', () => {
    expect(normalizeVisibleViews(null)).toEqual(ALL_VIEWS);
    expect(normalizeVisibleViews(undefined)).toEqual(ALL_VIEWS);
  });

  it('a bare string is an unusable value, not one id', () => {
    expect(normalizeVisibleViews('today')).toEqual(ALL_VIEWS);
  });

  it('a number or an object is unusable whatever its type', () => {
    expect(normalizeVisibleViews(42)).toEqual(ALL_VIEWS);
    expect(normalizeVisibleViews({})).toEqual(ALL_VIEWS);
    expect(normalizeVisibleViews({ today: true })).toEqual(ALL_VIEWS);
  });

  it('an empty array falls back to all six', () => {
    expect(normalizeVisibleViews([])).toEqual(ALL_VIEWS);
  });

  it('keeps the known ids in canonical order', () => {
    expect(normalizeVisibleViews(['today', 'habits'])).toEqual(['today', 'habits']);
    expect(normalizeVisibleViews(['habits', 'today'])).toEqual(['today', 'habits']);
  });

  it('treats the array as a set — repeats count once, unknown ids are dropped', () => {
    expect(normalizeVisibleViews(['today', 'today'])).toEqual(['today']);
    expect(normalizeVisibleViews(['today', 'bogus'])).toEqual(['today']);
    expect(normalizeVisibleViews(['bogus', 'today', 'finance', 'finance'])).toEqual(['today', 'finance']);
  });

  it('falls back when nothing known survived', () => {
    expect(normalizeVisibleViews(['bogus'])).toEqual(ALL_VIEWS);
    expect(normalizeVisibleViews([42])).toEqual(ALL_VIEWS);
    expect(normalizeVisibleViews([{ view: 'today' }])).toEqual(ALL_VIEWS);
    expect(normalizeVisibleViews([['today']])).toEqual(ALL_VIEWS);
  });

  it('matches exactly — no case folding, no trimming', () => {
    expect(normalizeVisibleViews(['Today'])).toEqual(ALL_VIEWS);
    expect(normalizeVisibleViews(['today '])).toEqual(ALL_VIEWS);
  });

  it('a 5000-entry array cannot widen the set', () => {
    const repeated = new Array(5000).fill('today');
    expect(normalizeVisibleViews(repeated)).toEqual(['today']);

    const mixed = [];
    for (let i = 0; i < 5000; i += 1) mixed.push(VIEW_ORDER[i % VIEW_ORDER.length]);
    expect(normalizeVisibleViews(mixed)).toEqual(ALL_VIEWS);
    expect(normalizeVisibleViews(mixed).length).toBeLessThanOrEqual(VIEW_ORDER.length);
  });

  it('never returns more than the six known ids, and never throws', () => {
    const noisy = ['today', 'planner', 'habits', 'review', 'finance', 'projects', 'today', 'projects'];
    expect(normalizeVisibleViews(noisy)).toEqual(ALL_VIEWS);
    expect(() => normalizeVisibleViews(null)).not.toThrow();
    expect(() => normalizeVisibleViews(['bogus'])).not.toThrow();
  });
});

describe('isViewVisible', () => {
  it('is plain membership', () => {
    expect(isViewVisible(['today', 'habits'], 'today')).toBe(true);
    expect(isViewVisible(['today', 'habits'], 'review')).toBe(false);
  });

  it('is ALL_VIEWS-safe when the set is null or absent', () => {
    expect(isViewVisible(null, 'finance')).toBe(true);
    expect(isViewVisible(undefined, 'finance')).toBe(true);
  });
});

describe('firstVisibleView', () => {
  it('returns the first visible view in canonical order', () => {
    expect(firstVisibleView(ALL_VIEWS)).toBe('today');
    expect(firstVisibleView(['habits', 'today'])).toBe('today');
    expect(firstVisibleView(['habits'])).toBe('habits');
    expect(firstVisibleView(['finance', 'projects'])).toBe('finance');
  });

  it('never returns undefined — an unusable set behaves like a fresh install', () => {
    expect(firstVisibleView(null)).toBe('today');
    expect(firstVisibleView([])).toBe('today');
    expect(firstVisibleView(['bogus'])).toBe('today');
  });
});

describe('visibleGotoKeys', () => {
  it('lists the visible letters in canonical order', () => {
    expect(visibleGotoKeys(ALL_VIEWS)).toEqual(['t', 'w', 'h', 'r', 'f', 'p']);
    expect(visibleGotoKeys(['habits', 'today'])).toEqual(['t', 'h']);
    expect(visibleGotoKeys(['finance'])).toEqual(['f']);
    expect(visibleGotoKeys(null)).toEqual(['t', 'w', 'h', 'r', 'f', 'p']);
  });
});

describe('buildShortcuts', () => {
  it('is element-for-element identical to the frozen SHORTCUTS with everything visible', () => {
    expect(buildShortcuts(ALL_VIEWS)).toEqual(SHORTCUTS);
    expect(buildShortcuts(ALL_VIEWS)).toHaveLength(8);
    expect(SHORTCUTS).toHaveLength(8);
  });

  it('keeps the frozen goto row byte-identical (U+2192 arrow, U+00B7 middot)', () => {
    const row = SHORTCUTS.find((shortcut) => shortcut.keys.startsWith('g '));
    expect(row).toEqual({
      keys: 'g → t / w / h / r / f / p',
      label: 'Today · Week · Habits · Review · Finance · Projects',
    });
  });

  it('rebuilds only the goto row from the visible views', () => {
    const rows = buildShortcuts(['today', 'planner']);
    expect(rows).toHaveLength(8);
    expect(rows[5]).toEqual({ keys: 'g → t / w', label: 'Today · Week' });
    // Every other row is unchanged.
    expect(rows.filter((_, index) => index !== 5)).toEqual(SHORTCUTS.filter((_, index) => index !== 5));
  });

  it('is null-safe — an absent preference advertises every view', () => {
    expect(buildShortcuts(null)).toEqual(SHORTCUTS);
    expect(buildShortcuts(undefined)).toEqual(SHORTCUTS);
  });
});
