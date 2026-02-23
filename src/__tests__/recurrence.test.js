import { describe, it, expect } from 'vitest';
import { 
  generateRecurringTasks, 
  isRecurringPatternValid, 
  getRecurrenceDescription 
} from '../utils/recurrence';
import { addDays, addWeeks, addMonths } from 'date-fns';

describe('Recurrence Utils', () => {
  describe('isRecurringPatternValid', () => {
    it('should validate daily pattern', () => {
      expect(isRecurringPatternValid({ type: 'daily', interval: 1 })).toBe(true);
    });

    it('should validate weekly pattern', () => {
      expect(isRecurringPatternValid({ 
        type: 'weekly', 
        interval: 1,
        daysOfWeek: [1, 3, 5]
      })).toBe(true);
    });

    it('should invalidate pattern without type', () => {
      expect(isRecurringPatternValid({ interval: 1 })).toBe(false);
    });

    it('should invalidate pattern with invalid interval', () => {
      expect(isRecurringPatternValid({ type: 'daily', interval: 0 })).toBe(false);
    });

    it('should invalidate weekly pattern without days', () => {
      expect(isRecurringPatternValid({ 
        type: 'weekly', 
        interval: 1,
        daysOfWeek: []
      })).toBe(false);
    });
  });

  describe('getRecurrenceDescription', () => {
    it('should describe daily recurrence', () => {
      const pattern = { type: 'daily', interval: 1 };
      expect(getRecurrenceDescription(pattern)).toBe('Every day');
    });

    it('should describe weekly recurrence with days', () => {
      const pattern = { type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] };
      const desc = getRecurrenceDescription(pattern);
      expect(desc).toContain('Every week');
      expect(desc).toContain('Mon');
      expect(desc).toContain('Wed');
      expect(desc).toContain('Fri');
    });

    it('should describe monthly recurrence', () => {
      const pattern = { type: 'monthly', interval: 2 };
      expect(getRecurrenceDescription(pattern)).toBe('Every 2 months');
    });

    it('should include end date in description', () => {
      const endDate = new Date('2026-12-31');
      const pattern = { type: 'daily', interval: 1, endDate: endDate.toISOString() };
      const desc = getRecurrenceDescription(pattern);
      expect(desc).toContain('until');
    });
  });

  describe('generateRecurringTasks', () => {
    it('should return single task if not recurring', () => {
      const task = {
        id: 1,
        title: 'Test Task',
        dueDate: new Date('2026-03-01').toISOString(),
        isRecurring: false
      };
      
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');
      
      const result = generateRecurringTasks(task, startDate, endDate);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(task);
    });

    it('should generate daily recurring tasks', () => {
      const task = {
        id: 1,
        title: 'Daily Task',
        dueDate: new Date('2026-03-01').toISOString(),
        isRecurring: true,
        recurrencePattern: {
          type: 'daily',
          interval: 1
        }
      };
      
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-05');
      
      const result = generateRecurringTasks(task, startDate, endDate);
      expect(result.length).toBeGreaterThanOrEqual(4); // At least 4 days
      expect(result[0].isRecurringInstance).toBe(true);
    });

    it('should generate weekly recurring tasks', () => {
      const task = {
        id: 1,
        title: 'Weekly Task',
        dueDate: new Date('2026-03-02').toISOString(), // Monday
        isRecurring: true,
        recurrencePattern: {
          type: 'weekly',
          interval: 1,
          daysOfWeek: [1] // Monday
        }
      };
      
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');
      
      const result = generateRecurringTasks(task, startDate, endDate);
      expect(result.length).toBeGreaterThanOrEqual(4); // ~4 Mondays in March
    });

    it('should respect end date in recurrence pattern', () => {
      const task = {
        id: 1,
        title: 'Limited Task',
        dueDate: new Date('2026-03-01').toISOString(),
        isRecurring: true,
        recurrencePattern: {
          type: 'daily',
          interval: 1,
          endDate: new Date('2026-03-05').toISOString()
        }
      };
      
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');
      
      const result = generateRecurringTasks(task, startDate, endDate);
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });
});
