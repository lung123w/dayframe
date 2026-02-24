import Dexie from 'dexie';

export const db = new Dexie('ProjectManagementDB');

// Version 1 — original schema (kept so Dexie can open existing databases)
db.version(1).stores({
  tasks: '++id, title, description, dueDate, priority, status, projectId, assignedTo, createdAt, updatedAt, isRecurring, recurrencePattern',
  teamMembers: '++id, name, email, role, createdAt',
  projects: '++id, name, color, createdAt'
});

// Version 2 — assignedTo changed from single int to array of ints
db.version(2).stores({
  tasks: '++id, title, description, dueDate, priority, status, projectId, assignedTo, createdAt, updatedAt, isRecurring, recurrencePattern',
  teamMembers: '++id, name, email, role, createdAt',
  projects: '++id, name, color, createdAt'
}).upgrade(async tx => {
  // Migrate each task: wrap scalar assignedTo into an array, leave nulls as []
  const tasks = await tx.table('tasks').toArray();
  for (const task of tasks) {
    let assignedTo = task.assignedTo;
    if (!Array.isArray(assignedTo)) {
      assignedTo = assignedTo != null ? [assignedTo] : [];
    }
    await tx.table('tasks').update(task.id, { assignedTo });
  }
});

// Task model
export class Task {
  constructor(data) {
    this.id = data.id;
    this.title = data.title || '';
    this.description = data.description || '';
    this.descriptionImages = data.descriptionImages || []; // Array of base64 images
    this.dueDate = data.dueDate || null;
    this.priority = data.priority || 'medium'; // low, medium, high
    this.status = data.status || 'todo'; // todo, in-progress, completed
    this.projectId = data.projectId || null;
    this.assignedTo = Array.isArray(data.assignedTo)
      ? data.assignedTo
      : (data.assignedTo != null ? [data.assignedTo] : []); // array of team member ids
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.isRecurring = data.isRecurring || false;
    this.recurrencePattern = data.recurrencePattern || null; // {type, interval, daysOfWeek, endDate}
  }
}

// Team Member model
export class TeamMember {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.email = data.email || '';
    this.role = data.role || '';
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}

// Project model
export class Project {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.color = data.color || '#3788d8';
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}

// Database operations
export const taskService = {
  async getAll() {
    return await db.tasks.toArray();
  },

  async getById(id) {
    return await db.tasks.get(id);
  },

  async create(task) {
    const newTask = new Task(task);
    newTask.createdAt = new Date().toISOString();
    newTask.updatedAt = new Date().toISOString();
    const id = await db.tasks.add(newTask);
    return { ...newTask, id };
  },

  async update(id, updates) {
    updates.updatedAt = new Date().toISOString();
    await db.tasks.update(id, updates);
    return await db.tasks.get(id);
  },

  async delete(id) {
    await db.tasks.delete(id);
  },

  async getByDateRange(startDate, endDate) {
    const allTasks = await db.tasks.toArray();
    return allTasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= startDate && taskDate <= endDate;
    });
  }
};

export const teamMemberService = {
  async getAll() {
    return await db.teamMembers.toArray();
  },

  async getById(id) {
    return await db.teamMembers.get(id);
  },

  async create(member) {
    const newMember = new TeamMember(member);
    newMember.createdAt = new Date().toISOString();
    const id = await db.teamMembers.add(newMember);
    return { ...newMember, id };
  },

  async update(id, updates) {
    await db.teamMembers.update(id, updates);
    return await db.teamMembers.get(id);
  },

  async delete(id) {
    await db.teamMembers.delete(id);
  }
};

export const projectService = {
  async getAll() {
    return await db.projects.toArray();
  },

  async getById(id) {
    return await db.projects.get(id);
  },

  async create(project) {
    const newProject = new Project(project);
    newProject.createdAt = new Date().toISOString();
    const id = await db.projects.add(newProject);
    return { ...newProject, id };
  },

  async update(id, updates) {
    await db.projects.update(id, updates);
    return await db.projects.get(id);
  },

  async delete(id) {
    await db.projects.delete(id);
  }
};
