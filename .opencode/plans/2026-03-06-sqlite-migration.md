# SQLite + Express API Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace IndexedDB (Dexie) with a SQLite database + Express API so that app data lives in a `data/app.db` file committed to git, traveling with branches.

**Architecture:**
```
Browser (React SPA)
    | fetch('/api/...')
Vite Dev Server (port 5173)
    | proxy /api/*
Express API Server (port 3001)
    | better-sqlite3
SQLite file: data/app.db
```
In production, Express serves the built `dist/` static files AND the API.

**Tech Stack:** Express 5, better-sqlite3, concurrently (dev tooling)

---

### Task 1: Create git branch and install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Create feature branch**

```bash
git checkout -b feature/sqlite-migration
```

**Step 2: Install server dependencies**

```bash
npm install express better-sqlite3 cors
npm install -D concurrently
```

**Step 3: Verify package.json updated**

Run: `grep -E "express|better-sqlite3|cors|concurrently" package.json`
Expected: All four packages listed

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add express, better-sqlite3, cors, concurrently deps"
```

---

### Task 2: Create SQLite database schema and initialization

**Files:**
- Create: `server/db.js`
- Create: `data/.gitkeep`

**Step 1: Create data directory**

```bash
mkdir -p data
touch data/.gitkeep
```

**Step 2: Create `server/db.js`**

This file initializes the SQLite database, creates tables if they don't exist, and exports the database instance.

```js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#3788d8',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    descriptionImages TEXT NOT NULL DEFAULT '[]',
    dueDate TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'todo',
    projectId INTEGER,
    assignedTo TEXT NOT NULL DEFAULT '[]',
    isRecurring INTEGER NOT NULL DEFAULT 0,
    recurrencePattern TEXT,
    statusOverrides TEXT NOT NULL DEFAULT '{}',
    statusFromOverrides TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parentTaskId INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parentTaskId) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

export default db;
```

**Step 3: Commit**

```bash
git add server/db.js data/.gitkeep
git commit -m "feat: add SQLite database schema and initialization"
```

---

### Task 3: Create Express API server with all CRUD routes

**Files:**
- Create: `server/index.js`
- Create: `server/routes/tasks.js`
- Create: `server/routes/projects.js`
- Create: `server/routes/teamMembers.js`
- Create: `server/routes/subtasks.js`

**Step 1: Create `server/index.js`**

```js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import teamMembersRouter from './routes/teamMembers.js';
import subtasksRouter from './routes/subtasks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' })); // large limit for base64 images

// API routes
app.use('/api/tasks', tasksRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/team-members', teamMembersRouter);
app.use('/api/subtasks', subtasksRouter);

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
```

**Step 2: Create `server/routes/tasks.js`**

JSON columns (`descriptionImages`, `assignedTo`, `recurrencePattern`, `statusOverrides`, `statusFromOverrides`) are stored as JSON strings in SQLite. The route handlers parse them on read and stringify on write.

```js
import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Helper: parse JSON columns from a raw DB row
function parseTask(row) {
  if (!row) return null;
  return {
    ...row,
    isRecurring: !!row.isRecurring,
    descriptionImages: JSON.parse(row.descriptionImages || '[]'),
    assignedTo: JSON.parse(row.assignedTo || '[]'),
    recurrencePattern: row.recurrencePattern ? JSON.parse(row.recurrencePattern) : null,
    statusOverrides: JSON.parse(row.statusOverrides || '{}'),
    statusFromOverrides: JSON.parse(row.statusFromOverrides || '[]'),
  };
}

// GET /api/tasks
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks').all();
  res.json(rows.map(parseTask));
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Task not found' });
  res.json(parseTask(row));
});

// POST /api/tasks
router.post('/', (req, res) => {
  const b = req.body;
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, descriptionImages, dueDate, priority, status,
      projectId, assignedTo, isRecurring, recurrencePattern, statusOverrides, statusFromOverrides,
      createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    b.title || '',
    b.description || '',
    JSON.stringify(b.descriptionImages || []),
    b.dueDate || null,
    b.priority || 'medium',
    b.status || 'todo',
    b.projectId || null,
    JSON.stringify(b.assignedTo || []),
    b.isRecurring ? 1 : 0,
    b.recurrencePattern ? JSON.stringify(b.recurrencePattern) : null,
    JSON.stringify(b.statusOverrides || {}),
    JSON.stringify(b.statusFromOverrides || []),
    now,
    now
  );
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(parseTask(newTask));
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const b = req.body;
  const now = new Date().toISOString();
  const merged = { ...parseTask(existing), ...b, updatedAt: now };

  const stmt = db.prepare(`
    UPDATE tasks SET title=?, description=?, descriptionImages=?, dueDate=?, priority=?, status=?,
      projectId=?, assignedTo=?, isRecurring=?, recurrencePattern=?, statusOverrides=?,
      statusFromOverrides=?, updatedAt=?
    WHERE id=?
  `);
  stmt.run(
    merged.title,
    merged.description,
    JSON.stringify(merged.descriptionImages || []),
    merged.dueDate || null,
    merged.priority,
    merged.status,
    merged.projectId || null,
    JSON.stringify(merged.assignedTo || []),
    merged.isRecurring ? 1 : 0,
    merged.recurrencePattern ? JSON.stringify(merged.recurrencePattern) : null,
    JSON.stringify(merged.statusOverrides || {}),
    JSON.stringify(merged.statusFromOverrides || []),
    now,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(parseTask(updated));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
```

**Step 3: Create `server/routes/projects.js`**

```js
import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/projects
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects').all();
  res.json(rows);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json(row);
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, color } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO projects (name, color, createdAt) VALUES (?, ?, ?)').run(
    name || '',
    color || '#3788d8',
    now
  );
  const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newProject);
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const { name, color } = req.body;
  db.prepare('UPDATE projects SET name=?, color=? WHERE id=?').run(
    name ?? existing.name,
    color ?? existing.color,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
```

**Step 4: Create `server/routes/teamMembers.js`**

```js
import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/team-members
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM team_members').all();
  res.json(rows);
});

// GET /api/team-members/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Team member not found' });
  res.json(row);
});

// POST /api/team-members
router.post('/', (req, res) => {
  const { name, email, role } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO team_members (name, email, role, createdAt) VALUES (?, ?, ?, ?)').run(
    name || '',
    email || '',
    role || '',
    now
  );
  const newMember = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newMember);
});

// PUT /api/team-members/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Team member not found' });

  const { name, email, role } = req.body;
  db.prepare('UPDATE team_members SET name=?, email=?, role=? WHERE id=?').run(
    name ?? existing.name,
    email ?? existing.email,
    role ?? existing.role,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/team-members/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
```

**Step 5: Create `server/routes/subtasks.js`**

```js
import { Router } from 'express';
import db from '../db.js';

const router = Router();

function parseSubtask(row) {
  if (!row) return null;
  return { ...row, completed: !!row.completed };
}

// GET /api/subtasks
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM subtasks').all();
  res.json(rows.map(parseSubtask));
});

// GET /api/subtasks/by-task/:taskId
router.get('/by-task/:taskId', (req, res) => {
  const rows = db.prepare('SELECT * FROM subtasks WHERE parentTaskId = ? ORDER BY sortOrder').all(req.params.taskId);
  res.json(rows.map(parseSubtask));
});

// POST /api/subtasks
router.post('/', (req, res) => {
  const { parentTaskId, title, completed, sortOrder } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO subtasks (parentTaskId, title, completed, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(parentTaskId, title || '', completed ? 1 : 0, sortOrder ?? 0, now, now);
  const newSubtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(parseSubtask(newSubtask));
});

// PUT /api/subtasks/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Subtask not found' });

  const now = new Date().toISOString();
  const { title, completed, sortOrder } = req.body;
  db.prepare('UPDATE subtasks SET title=?, completed=?, sortOrder=?, updatedAt=? WHERE id=?').run(
    title ?? existing.title,
    completed !== undefined ? (completed ? 1 : 0) : existing.completed,
    sortOrder ?? existing.sortOrder,
    now,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  res.json(parseSubtask(updated));
});

// PUT /api/subtasks/:id/toggle
router.put('/:id/toggle', (req, res) => {
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Subtask not found' });

  const now = new Date().toISOString();
  db.prepare('UPDATE subtasks SET completed=?, updatedAt=? WHERE id=?').run(
    existing.completed ? 0 : 1,
    now,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  res.json(parseSubtask(updated));
});

// DELETE /api/subtasks/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// DELETE /api/subtasks/by-task/:taskId
router.delete('/by-task/:taskId', (req, res) => {
  db.prepare('DELETE FROM subtasks WHERE parentTaskId = ?').run(req.params.taskId);
  res.status(204).end();
});

export default router;
```

**Step 6: Commit**

```bash
git add server/
git commit -m "feat: add Express API server with CRUD routes for all entities"
```

---

### Task 4: Configure Vite proxy and dev scripts

**Files:**
- Modify: `vite.config.js`
- Modify: `package.json`

**Step 1: Update `vite.config.js` to add proxy**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
  },
})
```

**Step 2: Update `package.json` scripts**

Replace the `"dev"` script and add `"dev:client"`, `"dev:server"`, and `"start"` scripts:

```json
"scripts": {
  "dev": "concurrently --kill-others \"npm run dev:server\" \"npm run dev:client\"",
  "dev:client": "vite",
  "dev:server": "node --watch server/index.js",
  "build": "vite build",
  "start": "NODE_ENV=production node server/index.js",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run"
}
```

**Step 3: Verify dev setup works**

Run: `npm run dev`
Expected: Both Vite (port 5173) and Express (port 3001) start. Console shows "API server running on http://localhost:3001".

**Step 4: Commit**

```bash
git add vite.config.js package.json
git commit -m "feat: configure Vite proxy and concurrent dev scripts"
```

---

### Task 5: Create frontend API client to replace Dexie services

**Files:**
- Create: `src/api.js`

This file provides the same interface as the old Dexie service objects, but uses `fetch('/api/...')` instead.

**Step 1: Create `src/api.js`**

```js
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
```

**Step 2: Commit**

```bash
git add src/api.js
git commit -m "feat: add fetch-based API client replacing Dexie services"
```

---

### Task 6: Update App.jsx to use API client instead of Dexie

**Files:**
- Modify: `src/App.jsx`

**Step 1: Change the import on line 8**

```js
// OLD:
import { taskService, teamMemberService, projectService, subtaskService } from './db';
// NEW:
import { taskService, teamMemberService, projectService, subtaskService } from './api';
```

No other changes needed in App.jsx — the API client has the identical interface.

**Step 2: Verify the app loads**

Run: `npm run dev`
Expected: App loads, calendar displays, task CRUD works through the API.

**Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: switch App.jsx from Dexie to API client"
```

---

### Task 7: Update TaskModal.jsx to use API client instead of Dexie

**Files:**
- Modify: `src/components/TaskModal.jsx`

**Step 1: Change the import on line 4**

```js
// OLD:
import { subtaskService } from '../db';
// NEW:
import { subtaskService } from '../api';
```

No other changes needed — same interface.

**Step 2: Verify subtask CRUD works**

Run: `npm run dev`
Expected: Opening a task modal, adding/editing/toggling/deleting subtasks all work.

**Step 3: Commit**

```bash
git add src/components/TaskModal.jsx
git commit -m "feat: switch TaskModal.jsx from Dexie to API client"
```

---

### Task 8: Update .gitignore and track the SQLite DB file

**Files:**
- Modify: `.gitignore`

**Step 1: Add SQLite temp file ignores to `.gitignore`**

Append these lines:
```
# SQLite WAL/SHM files (temporary, not needed in git)
data/*.db-wal
data/*.db-shm
```

Do NOT gitignore `data/app.db` — that's the whole point, it should be committed.

**Step 2: Stage and verify**

Run: `git add data/app.db .gitignore && git status`
Expected: `data/app.db` and `.gitignore` staged.

**Step 3: Commit**

```bash
git add .gitignore data/app.db
git commit -m "chore: track SQLite db file, ignore WAL/SHM temp files"
```

---

### Task 9: Update tests to work without Dexie

**Files:**
- Modify: `src/setupTests.js`
- Modify: `src/__tests__/App.test.jsx` (update mock path from `'../db'` to `'../api'`)
- Modify: `src/__tests__/TaskModal.test.jsx` (update mock path)
- Remove: `src/__tests__/subtaskService.test.js` (tested Dexie directly — no longer relevant)

**Step 1: Update `src/setupTests.js`**

Remove the IndexedDB mock. Keep the Notification mock.

```js
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
};
```

**Step 2: Update test mocks**

In `App.test.jsx`: change any `vi.mock('../db', ...)` to `vi.mock('../api', ...)`
In `TaskModal.test.jsx`: change any `vi.mock('../db', ...)` or `vi.mock('../../db', ...)` to use the api path instead.

**Step 3: Remove `subtaskService.test.js`**

This tested Dexie internals directly. The API client is a thin fetch wrapper — tested via the running app.

**Step 4: Run tests**

Run: `npm run test:run`
Expected: All remaining tests pass.

**Step 5: Commit**

```bash
git add src/setupTests.js src/__tests__/
git commit -m "test: update test mocks from Dexie to API client"
```

---

### Task 10: Remove Dexie dependency (cleanup)

**Files:**
- Remove: `src/db.js`
- Modify: `package.json` (remove `dexie`)

**Step 1: Verify no remaining imports of db.js**

Run: `grep -rn "from.*['\"].*\/db['\"]" src/ --include="*.jsx" --include="*.js"`
Expected: No results (all imports now use `./api` or `../api`)

**Step 2: Remove Dexie**

```bash
npm uninstall dexie
```

**Step 3: Delete old `src/db.js`**

```bash
rm src/db.js
```

**Step 4: Run tests and lint**

```bash
npm run test:run && npm run lint
```
Expected: All pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Dexie dependency and old db.js"
```

---

### Task 11: Final verification and production build

**Step 1: Start dev server and test all features**

```bash
npm run dev
```

Test checklist:
- [ ] Create a project
- [ ] Create a task with subtasks
- [ ] Edit a task
- [ ] Delete a task
- [ ] Drag-and-drop task on calendar
- [ ] Toggle subtask completion
- [ ] Add/edit/delete team members
- [ ] Recurring task creation and instance status overrides
- [ ] Backup/export button still works
- [ ] Verify `data/app.db` file exists and contains data

**Step 2: Production build**

```bash
npm run build && npm start
```

Expected: Express serves the built SPA at http://localhost:3001, API works, all features functional.

**Step 3: Verify git tracking**

```bash
git add data/app.db && git status
```

Expected: `data/app.db` changes show as modified, ready to commit with data.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete migration from IndexedDB to SQLite + Express API"
```
