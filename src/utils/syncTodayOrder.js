/**
 * Syncs sortOrder on real (non-recurring) tasks based on the today order array.
 * @param {string[]} newOrder - Ordered array of task ID strings
 * @param {object[]} tasks - All tasks (may include recurring instances)
 * @param {function} updateTask - async (id, patch) => void
 */
export async function syncSortOrderFromTodayOrder(newOrder, tasks, updateTask) {
  for (let i = 0; i < newOrder.length; i++) {
    const taskId = newOrder[i];
    const task = tasks.find(t => String(t.id) === String(taskId));
    if (!task || task.isRecurringInstance) continue;
    await updateTask(task.id, { sortOrder: i });
  }
}
