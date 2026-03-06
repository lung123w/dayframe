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
