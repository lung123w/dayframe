import { describe, it, expect, vi } from 'vitest';
import { syncSortOrderFromTodayOrder } from '../utils/syncTodayOrder';

describe('syncSortOrderFromTodayOrder', () => {
  it('calls updateTask with correct sortOrder for each non-recurring task', async () => {
    const updateTask = vi.fn(() => Promise.resolve());
    const tasks = [
      { id: 1, title: 'Task A' },
      { id: 2, title: 'Task B' },
      { id: 3, title: 'Task C' },
    ];
    const newOrder = ['3', '1', '2'];

    await syncSortOrderFromTodayOrder(newOrder, tasks, updateTask);

    expect(updateTask).toHaveBeenCalledTimes(3);
    expect(updateTask).toHaveBeenCalledWith(3, { sortOrder: 0 });
    expect(updateTask).toHaveBeenCalledWith(1, { sortOrder: 1 });
    expect(updateTask).toHaveBeenCalledWith(2, { sortOrder: 2 });
  });

  it('skips recurring instance tasks', async () => {
    const updateTask = vi.fn(() => Promise.resolve());
    const tasks = [
      { id: 1, title: 'Real Task' },
      { id: 2, title: 'Recurring Instance', isRecurringInstance: true },
      { id: 3, title: 'Another Real Task' },
    ];
    const newOrder = ['1', '2', '3'];

    await syncSortOrderFromTodayOrder(newOrder, tasks, updateTask);

    expect(updateTask).toHaveBeenCalledTimes(2);
    expect(updateTask).toHaveBeenCalledWith(1, { sortOrder: 0 });
    expect(updateTask).toHaveBeenCalledWith(3, { sortOrder: 2 });
    // task id=2 (recurring instance) should NOT have been updated
    expect(updateTask).not.toHaveBeenCalledWith(2, expect.anything());
  });

  it('skips task IDs not found in the tasks array', async () => {
    const updateTask = vi.fn(() => Promise.resolve());
    const tasks = [{ id: 1, title: 'Task A' }];
    const newOrder = ['1', '999']; // 999 doesn't exist

    await syncSortOrderFromTodayOrder(newOrder, tasks, updateTask);

    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith(1, { sortOrder: 0 });
  });
});
