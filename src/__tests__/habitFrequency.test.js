import { describe, it, expect } from 'vitest';
import { normalizeFrequency } from '../../server/habitFrequency.js';

const DAILY = { type: 'daily' };

// The live `habits.frequency` cell of row 9 (`Gym Session`): a JSON object encoded twice,
// i.e. the JS string `{"type":"weekly"}`. Pinned as a literal so a typo in the nested
// builders below fails loudly instead of silently testing the wrong cell shape.
const DOUBLE_ENCODED = '"{\\"type\\":\\"weekly\\"}"';

describe('normalizeFrequency — decoding the stored cell', () => {
  it('parses an ordinary single-encoded object cell', () => {
    expect(normalizeFrequency('{"type":"daily"}')).toEqual(DAILY);
  });

  it('unwraps the live double-encoded cell (habits row 9)', () => {
    expect(DOUBLE_ENCODED).toBe(JSON.stringify('{"type":"weekly"}'));
    expect(normalizeFrequency(DOUBLE_ENCODED)).toEqual({ type: 'weekly', timesPerWeek: 1 });
  });

  it('unwraps a triple-encoded cell (the second unwrap pass)', () => {
    const triple = JSON.stringify(DOUBLE_ENCODED);
    expect(normalizeFrequency(triple)).toEqual({ type: 'weekly', timesPerWeek: 1 });
  });

  it('falls back to daily for four or more layers instead of looping', () => {
    const quad = JSON.stringify(JSON.stringify(DOUBLE_ENCODED));
    const five = JSON.stringify(quad);
    expect(normalizeFrequency(quad)).toEqual(DAILY);
    expect(normalizeFrequency(five)).toEqual(DAILY);
  });

  it('falls back to daily for a cell that is not valid JSON', () => {
    expect(normalizeFrequency('{oops')).toEqual(DAILY);
    expect(normalizeFrequency('{"type":')).toEqual(DAILY);
  });

  it('falls back to daily for an empty-string cell', () => {
    expect(normalizeFrequency('')).toEqual(DAILY);
  });

  it('falls back to daily for non-object JSON and for non-string non-objects', () => {
    expect(normalizeFrequency('null')).toEqual(DAILY);
    expect(normalizeFrequency('[]')).toEqual(DAILY);
    expect(normalizeFrequency('3')).toEqual(DAILY);
    expect(normalizeFrequency('true')).toEqual(DAILY);
    expect(normalizeFrequency(null)).toEqual(DAILY);
    expect(normalizeFrequency(undefined)).toEqual(DAILY);
    expect(normalizeFrequency([1, 2])).toEqual(DAILY);
    expect(normalizeFrequency(42)).toEqual(DAILY);
    expect(normalizeFrequency(true)).toEqual(DAILY);
  });

  it('falls back to daily for an unknown or non-usable type (exact, case-sensitive match)', () => {
    expect(normalizeFrequency({})).toEqual(DAILY);
    expect(normalizeFrequency({ type: '' })).toEqual(DAILY);
    expect(normalizeFrequency({ type: null })).toEqual(DAILY);
    expect(normalizeFrequency({ type: 'monthly' })).toEqual(DAILY);
    expect(normalizeFrequency({ type: 'Weekly' })).toEqual(DAILY);
    expect(normalizeFrequency({ type: {} })).toEqual(DAILY);
  });

  it('keeps a healthy daily object unchanged', () => {
    expect(normalizeFrequency({ type: 'daily' })).toStrictEqual({ type: 'daily' });
    expect(normalizeFrequency('{"type":"daily"}')).toStrictEqual({ type: 'daily' });
  });
});

describe('normalizeFrequency — weekly timesPerWeek', () => {
  it('defaults a missing timesPerWeek to the number 1', () => {
    const result = normalizeFrequency({ type: 'weekly' });
    expect(result).toStrictEqual({ type: 'weekly', timesPerWeek: 1 });
    expect(typeof result.timesPerWeek).toBe('number');
  });

  it('keeps a healthy weekly frequency unchanged', () => {
    expect(normalizeFrequency({ type: 'weekly', timesPerWeek: 3 }))
      .toStrictEqual({ type: 'weekly', timesPerWeek: 3 });
  });

  it('replaces every unusable timesPerWeek with 1', () => {
    const unusable = [0, -1, '0', '', 'abc', null, true, [3], {}, NaN, Infinity, -Infinity, ' '];
    for (const value of unusable) {
      expect(normalizeFrequency({ type: 'weekly', timesPerWeek: value }))
        .toStrictEqual({ type: 'weekly', timesPerWeek: 1 });
    }
  });

  it('accepts a numeric string and coerces it to a number', () => {
    expect(normalizeFrequency({ type: 'weekly', timesPerWeek: '3' }))
      .toStrictEqual({ type: 'weekly', timesPerWeek: 3 });
    expect(normalizeFrequency({ type: 'weekly', timesPerWeek: ' 3 ' }))
      .toStrictEqual({ type: 'weekly', timesPerWeek: 3 });
  });

  it('preserves valid numbers unrounded and unclamped', () => {
    expect(normalizeFrequency({ type: 'weekly', timesPerWeek: 2.5 }).timesPerWeek).toBe(2.5);
    expect(normalizeFrequency({ type: 'weekly', timesPerWeek: 12 }).timesPerWeek).toBe(12);
  });
});

describe('normalizeFrequency — weekdays days', () => {
  it('filters, deduplicates and sorts mixed values', () => {
    expect(normalizeFrequency({ type: 'weekdays', days: [1, '2', 9, 1] }))
      .toStrictEqual({ type: 'weekdays', days: [1, 2] });
    expect(normalizeFrequency({ type: 'weekdays', days: [7, 1, 1, 0, 8, '2'] }))
      .toStrictEqual({ type: 'weekdays', days: [1, 2, 7] });
  });

  it('sorts unordered days ascending', () => {
    expect(normalizeFrequency({ type: 'weekdays', days: [7, 1, 3] }))
      .toStrictEqual({ type: 'weekdays', days: [1, 3, 7] });
  });

  it('drops out-of-range days', () => {
    expect(normalizeFrequency({ type: 'weekdays', days: [0, 8] }))
      .toStrictEqual({ type: 'weekdays', days: [] });
  });

  it('drops entries that are neither integers nor digit strings', () => {
    expect(normalizeFrequency({ type: 'weekdays', days: [2.5, true, null, [3], 'x', '', '1.0'] }))
      .toStrictEqual({ type: 'weekdays', days: [] });
  });

  it('becomes [] when days is missing, not an array, or empty', () => {
    expect(normalizeFrequency({ type: 'weekdays' })).toStrictEqual({ type: 'weekdays', days: [] });
    expect(normalizeFrequency({ type: 'weekdays', days: 3 })).toStrictEqual({ type: 'weekdays', days: [] });
    expect(normalizeFrequency({ type: 'weekdays', days: '1,2' })).toStrictEqual({ type: 'weekdays', days: [] });
    expect(normalizeFrequency({ type: 'weekdays', days: { 1: true } })).toStrictEqual({ type: 'weekdays', days: [] });
    expect(normalizeFrequency({ type: 'weekdays', days: [] })).toStrictEqual({ type: 'weekdays', days: [] });
  });

  it('keeps a healthy days list unchanged', () => {
    expect(normalizeFrequency({ type: 'weekdays', days: [1, 3, 5] }))
      .toStrictEqual({ type: 'weekdays', days: [1, 3, 5] });
  });
});

describe('normalizeFrequency — key ownership', () => {
  it('preserves keys it does not manage', () => {
    expect(normalizeFrequency({ type: 'weekly', timesPerWeek: 3, anchor: '2026-01-05', label: 'gym' }))
      .toStrictEqual({ type: 'weekly', timesPerWeek: 3, anchor: '2026-01-05', label: 'gym' });
  });

  it("copies another type's keys instead of normalizing or dropping them", () => {
    expect(normalizeFrequency({ type: 'daily', days: [1, 'x'], timesPerWeek: 0 }))
      .toStrictEqual({ type: 'daily', days: [1, 'x'], timesPerWeek: 0 });
  });
});

describe('normalizeFrequency — total and idempotent', () => {
  const garbage = [
    undefined, null, '', '{oops', '{', '}', '"', 3, 0, -1, true, false, [], [1, 2], {},
    { type: {} }, { type: [] }, { type: 'weekly', timesPerWeek: {} }, { type: 'weekdays', days: 'x' },
    'null', '[]', '3', 'true', '""', DOUBLE_ENCODED, JSON.stringify(JSON.stringify(DOUBLE_ENCODED)),
    JSON.stringify(JSON.stringify(JSON.stringify(DOUBLE_ENCODED))),
    { type: 'weekly', timesPerWeek: 2, nested: { a: [1, { b: 2 }] } },
  ];

  it('never throws and always returns one of the three documented types', () => {
    for (const input of garbage) {
      let result;
      expect(() => { result = normalizeFrequency(input); }).not.toThrow();
      expect(['daily', 'weekly', 'weekdays']).toContain(result.type);
      expect(Array.isArray(result)).toBe(false);
      expect(result).not.toBeNull();
    }
  });

  it('is idempotent — a second pass changes nothing', () => {
    const shapes = [
      { type: 'daily' },
      { type: 'weekly', timesPerWeek: 1 },
      { type: 'weekly', timesPerWeek: 2.5 },
      { type: 'weekdays', days: [1, 2] },
      { type: 'weekdays', days: [] },
      { type: 'weekly', timesPerWeek: 3, anchor: 'x' },
    ];
    for (const shape of shapes) {
      const once = normalizeFrequency(shape);
      expect(normalizeFrequency(once)).toStrictEqual(once);
    }
  });

  it('is idempotent for every garbage input as well', () => {
    for (const input of garbage) {
      const once = normalizeFrequency(input);
      expect(normalizeFrequency(once)).toStrictEqual(once);
    }
  });

  it('is idempotent through the route write path shape (normalized value fed back in)', () => {
    const fromCell = normalizeFrequency(DOUBLE_ENCODED);
    const rewritten = normalizeFrequency(fromCell);
    expect(rewritten).toStrictEqual(fromCell);
    expect(JSON.parse(JSON.stringify(rewritten))).toStrictEqual({ type: 'weekly', timesPerWeek: 1 });
  });
});
