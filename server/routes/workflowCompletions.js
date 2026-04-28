import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/workflow-completions?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required' });
  const rows = db.prepare('SELECT * FROM workflow_completions WHERE date = ?').all(date);
  res.json(rows);
});

// POST /api/workflow-completions
router.post('/', (req, res) => {
  const { stepId, date } = req.body;
  if (!stepId || !date) return res.status(400).json({ error: 'stepId and date required' });
  const now = new Date().toISOString();
  try {
    const result = db.prepare(
      'INSERT INTO workflow_completions (stepId, date, createdAt) VALUES (?, ?, ?)'
    ).run(stepId, date, now);
    const row = db.prepare('SELECT * FROM workflow_completions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch {
    // UNIQUE constraint — already completed
    const existing = db.prepare('SELECT * FROM workflow_completions WHERE stepId = ? AND date = ?').get(stepId, date);
    res.status(200).json(existing);
  }
});

// DELETE /api/workflow-completions?stepId=X&date=YYYY-MM-DD
router.delete('/', (req, res) => {
  const { stepId, date } = req.query;
  if (!stepId || !date) return res.status(400).json({ error: 'stepId and date required' });
  db.prepare('DELETE FROM workflow_completions WHERE stepId = ? AND date = ?').run(stepId, date);
  res.status(204).end();
});

export default router;
