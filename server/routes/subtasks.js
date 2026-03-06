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
