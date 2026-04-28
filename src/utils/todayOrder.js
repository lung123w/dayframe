/**
 * Merge a stored order (array of task IDs) with current today-tasks.
 * - Filters out IDs not present in todayTasks.
 * - Appends unordered tasks at the end.
 */
export function mergeOrder(storedOrder, todayTasks) {
  const getKey = (t) => String(t.id ?? `${t.recurringSourceId}-${t.instanceDate}`);
  const idSet = new Set(todayTasks.map(getKey));
  const validOrder = (storedOrder || []).filter(id => idSet.has(String(id)));
  const orderedSet = new Set(validOrder.map(String));
  const remainder = todayTasks.filter(t => !orderedSet.has(getKey(t)));
  const orderedTasks = validOrder
    .map(id => todayTasks.find(t => getKey(t) === String(id)))
    .filter(Boolean);
  return [...orderedTasks, ...remainder];
}
