import { describe, it, expect } from 'vitest';
import { MONTHLY_REVIEW_TEMPLATE, buildReviewFromTemplate } from '../utils/checklistTemplate';

describe('MONTHLY_REVIEW_TEMPLATE', () => {
  it('has all five expected sections', () => {
    const sectionNames = MONTHLY_REVIEW_TEMPLATE.map(s => s.section);
    expect(sectionNames).toEqual([
      'Personal Finance',
      'Family Finance',
      'Loan Processing',
      'Bond Cash Flow',
      'Credit Rating',
    ]);
  });

  it('has items with text, key, and section shape', () => {
    MONTHLY_REVIEW_TEMPLATE.forEach((section) => {
      expect(section).toHaveProperty('section');
      expect(Array.isArray(section.items)).toBe(true);
      expect(section.items.length).toBeGreaterThan(0);
      section.items.forEach((item) => {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('text');
        expect(typeof item.text).toBe('string');
        expect(item.text.length).toBeGreaterThan(0);
      });
    });
  });

  it('has unique keys within the template', () => {
    const keys = MONTHLY_REVIEW_TEMPLATE.flatMap(s => s.items.map(i => i.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('attaches a church-offering link to the "Upload the tithe receipt" item', () => {
    const tithing = MONTHLY_REVIEW_TEMPLATE
      .flatMap(s => s.items)
      .find(i => i.key === 'pf-7c');
    expect(tithing).toBeDefined();
    expect(tithing.link).toBe('https://www.yanfook.org.hk/offering');
  });
});

describe('buildReviewFromTemplate', () => {
  it('returns a review with the correct monthKey, year, month, and reviewDate for the given month', () => {
    const review = buildReviewFromTemplate('2026-08', new Date(2026, 7, 15), []);
    expect(review.monthKey).toBe('2026-08');
    expect(review.year).toBe(2026);
    expect(review.month).toBe(8);
    // August 2026: last Saturday is Aug 29 (local time)
    const reviewDate = new Date(review.reviewDate);
    expect(reviewDate.getFullYear()).toBe(2026);
    expect(reviewDate.getMonth()).toBe(7);
    expect(reviewDate.getDate()).toBe(29);
    expect(reviewDate.getDay()).toBe(6);
  });

  it('pre-populates checklist from the template, grouped by section, with sequential order within each section', () => {
    const review = buildReviewFromTemplate('2026-08', new Date(2026, 7, 15), []);
    expect(review.checklist.length).toBeGreaterThan(0);
    const bySection = {};
    review.checklist.forEach((item) => {
      bySection[item.section] = bySection[item.section] || [];
      bySection[item.section].push(item);
    });
    Object.values(bySection).forEach((items) => {
      items.forEach((item, idx) => {
        expect(item.order).toBe(idx);
      });
    });
    // Verify section names match
    expect(Object.keys(bySection).sort()).toEqual([
      'Bond Cash Flow',
      'Credit Rating',
      'Family Finance',
      'Loan Processing',
      'Personal Finance',
    ]);
  });

  it('marks every checklist item as not completed and null completedAt', () => {
    const review = buildReviewFromTemplate('2026-08', new Date(2026, 7, 15), []);
    review.checklist.forEach((item) => {
      expect(item.completed).toBe(false);
      expect(item.completedAt).toBeNull();
    });
  });

  it('builds an empty cardEntries array when no cards are provided', () => {
    const review = buildReviewFromTemplate('2026-08', new Date(2026, 7, 15), []);
    expect(review.cardEntries).toEqual([]);
  });

  it('builds one empty card entry per provided card', () => {
    const cards = [
      { id: 1, name: 'Hang Seng CC', institution: 'HSBC', accountNumber: '1111' },
      { id: 2, name: 'HSBC RED', institution: 'HSBC', accountNumber: '2222' },
    ];
    const review = buildReviewFromTemplate('2026-08', new Date(2026, 7, 15), cards);
    expect(review.cardEntries).toHaveLength(2);
    review.cardEntries.forEach((entry, idx) => {
      expect(entry.cardId).toBe(cards[idx].id);
      expect(entry.cardName).toBe(cards[idx].name);
      expect(entry.statementSaved).toBe(false);
      expect(entry.amount).toBe('');
      expect(entry.dueDate).toBe('');
      expect(entry.moneyProVerified).toBe(false);
      expect(entry.ppsSetUp).toBe(false);
      expect(entry.moneyProRecorded).toBe(false);
      expect(entry.notes).toBe('');
    });
  });

  it('uses the current month when no monthKey is provided', () => {
    const review = buildReviewFromTemplate(undefined, new Date(2026, 7, 15), []);
    expect(review.monthKey).toBe('2026-08');
  });

  it('sets initial status to pending and completedAt to null', () => {
    const review = buildReviewFromTemplate('2026-08', new Date(2026, 7, 15), []);
    expect(review.status).toBe('pending');
    expect(review.completedAt).toBeNull();
  });
});
