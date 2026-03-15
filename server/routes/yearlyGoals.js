import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET / — get goals for a specific year (query: ?year=2026)
router.get('/', (req, res) => {
  const { year } = req.query;
  if (!year) {
    return res.status(400).json({ error: 'year query parameter required' });
  }
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) {
    return res.status(400).json({ error: 'year must be a number' });
  }
  
  const row = db.prepare('SELECT * FROM yearly_goals WHERE year = ?').get(yearNum);
  if (!row) return res.json({ year: yearNum, goals: '' });
  res.json(row);
});

// PUT / — upsert goals for a year
router.put('/', (req, res) => {
  const { year, goals } = req.body;
  if (!year || typeof goals !== 'string') {
    return res.status(400).json({ error: 'year (number) and goals (string) required' });
  }
  
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) {
    return res.status(400).json({ error: 'year must be a number' });
  }
  
  const existing = db.prepare('SELECT id FROM yearly_goals WHERE year = ?').get(yearNum);
  if (existing) {
    db.prepare('UPDATE yearly_goals SET goals = ?, updatedAt = datetime(\'now\') WHERE id = ?')
      .run(goals, existing.id);
    const updated = db.prepare('SELECT * FROM yearly_goals WHERE id = ?').get(existing.id);
    res.json(updated);
  } else {
    const result = db.prepare('INSERT INTO yearly_goals (year, goals) VALUES (?, ?)')
      .run(yearNum, goals);
    const created = db.prepare('SELECT * FROM yearly_goals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  }
});

export default router;
