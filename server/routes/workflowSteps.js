import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/workflow-steps
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM workflow_steps ORDER BY sortOrder, id').all();
  res.json(rows);
});

// POST /api/workflow-steps
router.post('/', (req, res) => {
  const { text, sortOrder } = req.body;
  const now = new Date().toISOString();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sortOrder), -1) as m FROM workflow_steps').get().m;
  const result = db.prepare(
    'INSERT INTO workflow_steps (text, sortOrder, createdAt) VALUES (?, ?, ?)'
  ).run(text || '', sortOrder ?? maxOrder + 1, now);
  const row = db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// PUT /api/workflow-steps/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Workflow step not found' });
  const { text, sortOrder } = req.body;
  db.prepare('UPDATE workflow_steps SET text = ?, sortOrder = ? WHERE id = ?').run(
    text ?? existing.text,
    sortOrder ?? existing.sortOrder,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/workflow-steps/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workflow_steps WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
