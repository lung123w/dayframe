import { describe, it, expect } from 'vitest';
import { groupTasksByUrgency } from '../utils/planningGroups';

function makeTask(id, dueDate, status = 'pending', isRecurring = false) {
  return { id, title: `Task ${id}`, dueDate, status, isRecurring };
}

describe('groupTasksByUrgency', () => {
  const TODAY = '2026-04-26';
  const YESTERDAY = '2026-04-25';
  const TOMORROW = '2026-04-27';
  const IN5 = '2026-05-01';
  const IN8 = '2026-05-04'; // outside 7-day window

  it('puts past-due tasks in overdue', () => {
    const tasks = [makeTask(1, YESTERDAY)];
    const { overdue } = groupTasksByUrgency(tasks, TODAY);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe(1);
  });

  it('puts today tasks in dueToday', () => {
    const tasks = [makeTask(1, TODAY)];
    const { dueToday } = groupTasksByUrgency(tasks, TODAY);
    expect(dueToday).toHaveLength(1);
  });

  it('puts tasks within 7 days in upcoming', () => {
    const tasks = [makeTask(1, TOMORROW), makeTask(2, IN5)];
    const { upcoming } = groupTasksByUrgency(tasks, TODAY);
    expect(upcoming).toHaveLength(2);
  });

  it('excludes tasks more than 7 days out', () => {
    const tasks = [makeTask(1, IN8)];
    const { overdue, dueToday, upcoming } = groupTasksByUrgency(tasks, TODAY);
    expect(overdue.length + dueToday.length + upcoming.length).toBe(0);
  });

  it('puts unscheduled tasks in upcoming', () => {
    const tasks = [makeTask(1, null)];
    const { upcoming } = groupTasksByUrgency(tasks, TODAY);
    expect(upcoming).toHaveLength(1);
  });

  it('excludes completed tasks', () => {
    const tasks = [makeTask(1, TODAY, 'completed')];
    const { overdue, dueToday, upcoming } = groupTasksByUrgency(tasks, TODAY);
    expect(overdue.length + dueToday.length + upcoming.length).toBe(0);
  });

  it('excludes recurring tasks', () => {
    const tasks = [makeTask(1, TODAY, 'pending', true)];
    const { overdue, dueToday, upcoming } = groupTasksByUrgency(tasks, TODAY);
    expect(overdue.length + dueToday.length + upcoming.length).toBe(0);
  });

  it('handles empty task list', () => {
    const { overdue, dueToday, upcoming } = groupTasksByUrgency([], TODAY);
    expect(overdue).toHaveLength(0);
    expect(dueToday).toHaveLength(0);
    expect(upcoming).toHaveLength(0);
  });
});
