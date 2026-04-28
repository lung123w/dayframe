function toLocalDateStr(date) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

/**
 * Group tasks into three urgency buckets:
 *   overdue  — pending, dueDate < today
 *   dueToday — dueDate === today
 *   upcoming — dueDate within the next 7 days (exclusive of today), or unscheduled
 */
export function groupTasksByUrgency(tasks, today) {
  const todayStr = today || toLocalDateStr(new Date());
  const todayDate = new Date(todayStr);
  const sevenDaysOut = new Date(todayDate);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const sevenDaysStr = toLocalDateStr(sevenDaysOut);

  const overdue = [];
  const dueToday = [];
  const upcoming = [];

  for (const task of tasks) {
    if (task.status === 'completed' || task.isRecurring) continue;
    const due = task.dueDate ? toLocalDateStr(task.dueDate) : null;
    if (!due) {
      upcoming.push(task);
    } else if (due < todayStr) {
      overdue.push(task);
    } else if (due === todayStr) {
      dueToday.push(task);
    } else if (due > todayStr && due <= sevenDaysStr) {
      upcoming.push(task);
    }
  }

  return { overdue, dueToday, upcoming };
}
