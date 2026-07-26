import { describe, it, expect } from 'vitest';
import { ABBREVIATION_GROUPS } from '../utils/abbreviations';

describe('ABBREVIATION_GROUPS', () => {
  it('exposes exactly the two groups from the user PDF', () => {
    expect(ABBREVIATION_GROUPS.map(g => g.id)).toEqual(['personal', 'family']);
  });

  it('contains 25 personal entries (matching the PDF row count)', () => {
    const personal = ABBREVIATION_GROUPS.find(g => g.id === 'personal');
    expect(personal).toBeDefined();
    expect(personal.items).toHaveLength(25);
  });

  it('contains 5 family entries', () => {
    const family = ABBREVIATION_GROUPS.find(g => g.id === 'family');
    expect(family).toBeDefined();
    expect(family.items).toHaveLength(5);
  });

  it('each entry has a non-empty statement and abbreviation', () => {
    for (const group of ABBREVIATION_GROUPS) {
      for (const item of group.items) {
        expect(typeof item.statement).toBe('string');
        expect(item.statement.length).toBeGreaterThan(0);
        expect(typeof item.abbr).toBe('string');
        expect(item.abbr.length).toBeGreaterThan(0);
      }
    }
  });

  it('all abbreviations are unique across groups', () => {
    const all = ABBREVIATION_GROUPS.flatMap(g => g.items.map(i => i.abbr));
    expect(new Set(all).size).toBe(all.length);
  });

  it('includes the key tithe-link-related statement (Hang Seng Bank Credit Card)', () => {
    const personal = ABBREVIATION_GROUPS.find(g => g.id === 'personal');
    const hsb = personal.items.find(i => i.statement === 'Hang Seng Bank Credit Card');
    expect(hsb).toBeDefined();
    expect(hsb.abbr).toBe('hsb_cc_jan19');
  });
});
