import { describe, it, expect } from 'vitest';
import { mergeOrder } from '../utils/todayOrder';

describe('mergeOrder', () => {
  const makeTask = (id) => ({ id, title: `Task ${id}`, status: 'pending' });

  it('returns tasks in stored order', () => {
    const tasks = [makeTask(1), makeTask(2), makeTask(3)];
    const result = mergeOrder(['2', '3', '1'], tasks);
    expect(result.map(t => t.id)).toEqual([2, 3, 1]);
  });

  it('appends unordered tasks at the bottom', () => {
    const tasks = [makeTask(1), makeTask(2), makeTask(3)];
    const result = mergeOrder(['1'], tasks);
    expect(result[0].id).toBe(1);
    // 2 and 3 come after, in original task order
    expect(result.map(t => t.id)).toContain(2);
    expect(result.map(t => t.id)).toContain(3);
  });

  it('filters out stale IDs not in todayTasks', () => {
    const tasks = [makeTask(1), makeTask(3)];
    const result = mergeOrder(['1', '2', '3'], tasks); // '2' is stale
    expect(result.map(t => String(t.id))).not.toContain('2');
    expect(result.map(t => t.id)).toEqual([1, 3]);
  });

  it('handles null/undefined storedOrder gracefully', () => {
    const tasks = [makeTask(1)];
    const result = mergeOrder(null, tasks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('handles empty storedOrder', () => {
    const tasks = [makeTask(1), makeTask(2)];
    const result = mergeOrder([], tasks);
    expect(result).toHaveLength(2);
  });

  it('handles empty todayTasks', () => {
    const result = mergeOrder(['1', '2'], []);
    expect(result).toHaveLength(0);
  });
});
