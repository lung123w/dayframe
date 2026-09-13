async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const taskService = {
  getAll: () => request('/api/tasks'),
  getById: (id) => request(`/api/tasks/${id}`),
  create: (task) => request('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
  update: (id, updates) => request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
};

export const projectService = {
  getAll: () => request('/api/projects'),
  getById: (id) => request(`/api/projects/${id}`),
  create: (project) => request('/api/projects', { method: 'POST', body: JSON.stringify(project) }),
  update: (id, updates) => request(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),
};

export const teamMemberService = {
  getAll: () => request('/api/team-members'),
  getById: (id) => request(`/api/team-members/${id}`),
  create: (member) => request('/api/team-members', { method: 'POST', body: JSON.stringify(member) }),
  update: (id, updates) => request(`/api/team-members/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id) => request(`/api/team-members/${id}`, { method: 'DELETE' }),
};

export const subtaskService = {
  getAll: () => request('/api/subtasks'),
  getByTaskId: (taskId) => request(`/api/subtasks/by-task/${taskId}`),
  create: (subtask) => request('/api/subtasks', { method: 'POST', body: JSON.stringify(subtask) }),
  update: (id, updates) => request(`/api/subtasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id) => request(`/api/subtasks/${id}`, { method: 'DELETE' }),
  deleteByTaskId: (taskId) => request(`/api/subtasks/by-task/${taskId}`, { method: 'DELETE' }),
  toggleCompleted: (id) => request(`/api/subtasks/${id}/toggle`, { method: 'PUT' }),
};

export const habitService = {
  getAll: () => request('/api/habits'),
  getById: (id) => request(`/api/habits/${id}`),
  create: (habit) => request('/api/habits', { method: 'POST', body: JSON.stringify(habit) }),
  update: (id, updates) => request(`/api/habits/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id) => request(`/api/habits/${id}`, { method: 'DELETE' }),
};

export const habitEntryService = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/habit-entries${qs ? '?' + qs : ''}`);
  },
  getByHabit: (habitId) => request(`/api/habit-entries/by-habit/${habitId}`),
  create: (entry) => request('/api/habit-entries', { method: 'POST', body: JSON.stringify(entry) }),
  update: (id, updates) => request(`/api/habit-entries/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id) => request(`/api/habit-entries/${id}`, { method: 'DELETE' }),
  deleteByDate: (habitId, date) => request(`/api/habit-entries/by-date?habitId=${habitId}&date=${date}`, { method: 'DELETE' }),
};

export const weeklyObjectiveService = {
  getByWeek: (weekStart) => request(`/api/weekly-objectives?weekStart=${weekStart}`),
  upsert: (weekStart, objectives) => request('/api/weekly-objectives', {
    method: 'PUT',
    body: JSON.stringify({ weekStart, objectives }),
  }),
};

export const weeklyReviewService = {
  getByWeek: (weekStart) => request(`/api/weekly-reviews?weekStart=${weekStart}`),
  upsert: (weekStart, document) => request('/api/weekly-reviews', {
    method: 'PUT',
    body: JSON.stringify({ weekStart, ...document }),
  }),
};

export const dailyNoteService = {
  getByDate: (date) => request(`/api/daily-notes?date=${date}`),
  upsert: (data) => request('/api/daily-notes', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

export const yearlyGoalService = {
  getByYear: (year) => request(`/api/yearly-goals?year=${year}`),
  upsert: (data) => request('/api/yearly-goals', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

export const settingsService = {
  get: async (key) => {
    const res = await request(`/api/settings/${key}`);
    return res?.value ?? null;
  },
  set: (key, value) => request(`/api/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  }),
};

export const workflowStepService = {
  getAll: () => request('/api/workflow-steps'),
  create: (step) => request('/api/workflow-steps', { method: 'POST', body: JSON.stringify(step) }),
  update: (id, updates) => request(`/api/workflow-steps/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id) => request(`/api/workflow-steps/${id}`, { method: 'DELETE' }),
};

export const workflowCompletionService = {
  getForDate: (date) => request(`/api/workflow-completions?date=${date}`),
  create: (data) => request('/api/workflow-completions', { method: 'POST', body: JSON.stringify(data) }),
  deleteByStepAndDate: (stepId, date) => request(`/api/workflow-completions?stepId=${stepId}&date=${date}`, { method: 'DELETE' }),
};

export const keyEventService = {
  getAll: () => request('/api/key-events'),
  getByDateRange: (from, to) => request(`/api/key-events?from=${from}&to=${to}`),
  getById: (id) => request(`/api/key-events/${id}`),
  create: (event) => request('/api/key-events', { method: 'POST', body: JSON.stringify(event) }),
  update: (id, updates) => request(`/api/key-events/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id) => request(`/api/key-events/${id}`, { method: 'DELETE' }),
};

export const financialCardService = {
  getAll: () => request('/api/financial-cards'),
  getById: (id) => request(`/api/financial-cards/${id}`),
  create: (card) => request('/api/financial-cards', { method: 'POST', body: JSON.stringify(card) }),
  update: (id, updates) => request(`/api/financial-cards/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deactivate: (id) => request(`/api/financial-cards/${id}/deactivate`, { method: 'POST' }),
  reorder: (id, direction) => request(`/api/financial-cards/${id}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  }),
};

export const monthlyReviewService = {
  getAll: () => request('/api/monthly-reviews'),
  getByMonth: (monthKey) => request(`/api/monthly-reviews/by-month?monthKey=${encodeURIComponent(monthKey)}`),
  getCurrent: () => request('/api/monthly-reviews/current'),
  createForMonth: (monthKey) => request('/api/monthly-reviews', {
    method: 'POST',
    body: JSON.stringify({ monthKey }),
  }),
  upsert: (review) => request('/api/monthly-reviews', { method: 'PUT', body: JSON.stringify(review) }),
  toggleChecklistItem: (id, itemId) => request(`/api/monthly-reviews/${id}/checklist/${itemId}`, {
    method: 'PATCH',
  }),
  updateCardEntry: (id, cardId, patch) => request(`/api/monthly-reviews/${id}/card-entry/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }),
  updateNotes: (id, notes) => request(`/api/monthly-reviews/${id}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  }),
  updateImages: (id, images) => request(`/api/monthly-reviews/${id}/images`, {
    method: 'PATCH',
    body: JSON.stringify({ images }),
  }),
  syncCards: (id) => request(`/api/monthly-reviews/${id}/sync-cards`, { method: 'POST' }),
  complete: (id) => request(`/api/monthly-reviews/${id}/complete`, { method: 'POST' }),
  reopen: (id) => request(`/api/monthly-reviews/${id}/reopen`, { method: 'POST' }),
};
