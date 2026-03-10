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
      estimatedMinutes, sortOrder, startTime, endTime, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    b.estimatedMinutes ?? null,
    b.sortOrder ?? 0,
    b.startTime || null,
    b.endTime || null,
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
      statusFromOverrides=?, estimatedMinutes=?, sortOrder=?, startTime=?, endTime=?, updatedAt=?
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
    merged.estimatedMinutes !== undefined ? merged.estimatedMinutes : (existing.estimatedMinutes ?? null),
    merged.sortOrder ?? existing.sortOrder ?? 0,
    merged.startTime !== undefined ? merged.startTime : (existing.startTime || null),
    merged.endTime !== undefined ? merged.endTime : (existing.endTime || null),
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
