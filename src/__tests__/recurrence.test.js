import { describe, it, expect } from 'vitest';
import { 
  generateRecurringTasks, 
  isRecurringPatternValid, 
  getRecurrenceDescription,
  resolveInstanceStatus
} from '../utils/recurrence';

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

    it('should apply per-instance statusOverrides to generated instances', () => {
      const mar2 = new Date('2026-03-02T00:00:00.000Z').toISOString();
      const task = {
        id: 1,
        title: 'Daily Task',
        status: 'todo',
        dueDate: new Date('2026-03-01T00:00:00.000Z').toISOString(),
        isRecurring: true,
        recurrencePattern: { type: 'daily', interval: 1 },
        statusOverrides: { [mar2]: 'completed' },
        statusFromOverrides: [],
      };

      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-04');
      const result = generateRecurringTasks(task, startDate, endDate);

      // The instance on Mar 2 should be completed; others should be todo
      const mar2Instance = result.find(r => r.instanceDate === mar2);
      expect(mar2Instance).toBeDefined();
      expect(mar2Instance.status).toBe('completed');

      const otherInstances = result.filter(r => r.instanceDate !== mar2);
      for (const inst of otherInstances) {
        expect(inst.status).toBe('todo');
      }
    });

    it('should apply statusFromOverrides ("this and all future") to generated instances', () => {
      const mar2 = new Date('2026-03-02T00:00:00.000Z').toISOString();
      const task = {
        id: 1,
        title: 'Daily Task',
        status: 'todo',
        dueDate: new Date('2026-03-01T00:00:00.000Z').toISOString(),
        isRecurring: true,
        recurrencePattern: { type: 'daily', interval: 1 },
        statusOverrides: {},
        statusFromOverrides: [{ fromDate: mar2, status: 'in-progress' }],
      };

      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-05');
      const result = generateRecurringTasks(task, startDate, endDate);

      for (const inst of result) {
        const instTime = new Date(inst.instanceDate).getTime();
        const mar2Time = new Date(mar2).getTime();
        if (instTime >= mar2Time) {
          expect(inst.status).toBe('in-progress');
        } else {
          expect(inst.status).toBe('todo');
        }
      }
    });

    it('should prioritise per-instance override over from-date override', () => {
      const mar2 = new Date('2026-03-02T00:00:00.000Z').toISOString();
      const mar3 = new Date('2026-03-03T00:00:00.000Z').toISOString();
      const task = {
        id: 1,
        title: 'Daily Task',
        status: 'todo',
        dueDate: new Date('2026-03-01T00:00:00.000Z').toISOString(),
        isRecurring: true,
        recurrencePattern: { type: 'daily', interval: 1 },
        // "from Mar 2 onward" = in-progress, but Mar 3 specifically = completed
        statusOverrides: { [mar3]: 'completed' },
        statusFromOverrides: [{ fromDate: mar2, status: 'in-progress' }],
      };

      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-05');
      const result = generateRecurringTasks(task, startDate, endDate);

      const mar2Inst = result.find(r => r.instanceDate === mar2);
      expect(mar2Inst.status).toBe('in-progress');

      const mar3Inst = result.find(r => r.instanceDate === mar3);
      expect(mar3Inst.status).toBe('completed'); // per-instance wins
    });
  });

  describe('resolveInstanceStatus', () => {
    it('should return base status when no overrides exist', () => {
      const task = { status: 'todo', statusOverrides: {}, statusFromOverrides: [] };
      expect(resolveInstanceStatus(task, '2026-03-01T00:00:00.000Z')).toBe('todo');
    });

    it('should return base status when overrides fields are missing', () => {
      const task = { status: 'in-progress' };
      expect(resolveInstanceStatus(task, '2026-03-01T00:00:00.000Z')).toBe('in-progress');
    });

    it('should return per-instance override when it matches', () => {
      const dateStr = '2026-03-05T00:00:00.000Z';
      const task = {
        status: 'todo',
        statusOverrides: { [dateStr]: 'completed' },
        statusFromOverrides: [],
      };
      expect(resolveInstanceStatus(task, dateStr)).toBe('completed');
    });

    it('should return from-date override for dates on or after fromDate', () => {
      const task = {
        status: 'todo',
        statusOverrides: {},
        statusFromOverrides: [
          { fromDate: '2026-03-03T00:00:00.000Z', status: 'in-progress' },
        ],
      };
      expect(resolveInstanceStatus(task, '2026-03-03T00:00:00.000Z')).toBe('in-progress');
      expect(resolveInstanceStatus(task, '2026-03-10T00:00:00.000Z')).toBe('in-progress');
      expect(resolveInstanceStatus(task, '2026-03-01T00:00:00.000Z')).toBe('todo');
    });

    it('should use the latest matching from-date override', () => {
      const task = {
        status: 'todo',
        statusOverrides: {},
        statusFromOverrides: [
          { fromDate: '2026-03-02T00:00:00.000Z', status: 'in-progress' },
          { fromDate: '2026-03-05T00:00:00.000Z', status: 'completed' },
        ],
      };
      expect(resolveInstanceStatus(task, '2026-03-04T00:00:00.000Z')).toBe('in-progress');
      expect(resolveInstanceStatus(task, '2026-03-06T00:00:00.000Z')).toBe('completed');
    });
  });
});
