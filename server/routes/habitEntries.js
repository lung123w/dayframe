import { Router } from 'express';
import db from '../db.js';

const router = Router();

function parseEntry(row) {
  if (!row) return null;
  return { ...row };
}

// GET /api/habit-entries?habitId=X&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', (req, res) => {
  const { habitId, from, to } = req.query;
  let sql = 'SELECT * FROM habit_entries WHERE 1=1';
  const params = [];
  if (habitId) { sql += ' AND habitId = ?'; params.push(habitId); }
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }
  sql += ' ORDER BY date';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(parseEntry));
});

// GET /api/habit-entries/by-habit/:habitId
router.get('/by-habit/:habitId', (req, res) => {
  const rows = db.prepare('SELECT * FROM habit_entries WHERE habitId = ? ORDER BY date').all(req.params.habitId);
  res.json(rows.map(parseEntry));
});

// POST /api/habit-entries
router.post('/', (req, res) => {
  const { habitId, date, timeSpentSeconds } = req.body;
  if (!habitId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'habitId and a valid date (YYYY-MM-DD) are required' });
  }
  const now = new Date().toISOString();
  try {
    const result = db.prepare(
      'INSERT INTO habit_entries (habitId, date, timeSpentSeconds, createdAt) VALUES (?, ?, ?, ?)'
    ).run(habitId, date, timeSpentSeconds || 0, now);
    const newEntry = db.prepare('SELECT * FROM habit_entries WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseEntry(newEntry));
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Entry already exists for this habit and date' });
    }
    throw err;
  }
});

// PUT /api/habit-entries/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM habit_entries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  const { timeSpentSeconds } = req.body;
  db.prepare('UPDATE habit_entries SET timeSpentSeconds=? WHERE id=?').run(
    timeSpentSeconds ?? existing.timeSpentSeconds,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM habit_entries WHERE id = ?').get(req.params.id);
  res.json(parseEntry(updated));
});

// DELETE /api/habit-entries/by-date?habitId=X&date=YYYY-MM-DD
router.delete('/by-date', (req, res) => {
  const { habitId, date } = req.query;
  db.prepare('DELETE FROM habit_entries WHERE habitId = ? AND date = ?').run(habitId, date);
  res.status(204).end();
});

// DELETE /api/habit-entries/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM habit_entries WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
