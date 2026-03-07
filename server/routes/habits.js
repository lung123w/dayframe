import { Router } from 'express';
import db from '../db.js';

const router = Router();

function parseHabit(row) {
  if (!row) return null;
  return {
    ...row,
    isArchived: !!row.isArchived,
    frequency: JSON.parse(row.frequency || '{"type":"daily"}'),
  };
}

// GET /api/habits
router.get('/', (req, res) => {
  const includeArchived = req.query.includeArchived === '1';
  const sql = includeArchived
    ? 'SELECT * FROM habits ORDER BY sortOrder'
    : 'SELECT * FROM habits WHERE isArchived = 0 ORDER BY sortOrder';
  const rows = db.prepare(sql).all();
  res.json(rows.map(parseHabit));
});

// GET /api/habits/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Habit not found' });
  res.json(parseHabit(row));
});

// POST /api/habits
router.post('/', (req, res) => {
  const b = req.body;
  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO habits (name, description, color, frequency, isArchived, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    b.name || '',
    b.description || '',
    b.color || '#10B981',
    JSON.stringify(b.frequency || { type: 'daily' }),
    b.isArchived ? 1 : 0,
    b.sortOrder ?? 0,
    now
  );
  const newHabit = db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(parseHabit(newHabit));
});

// PUT /api/habits/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Habit not found' });

  const b = req.body;
  const parsed = parseHabit(existing);
  const merged = { ...parsed, ...b };

  db.prepare(
    'UPDATE habits SET name=?, description=?, color=?, frequency=?, isArchived=?, sortOrder=? WHERE id=?'
  ).run(
    merged.name,
    merged.description,
    merged.color,
    JSON.stringify(merged.frequency),
    merged.isArchived ? 1 : 0,
    merged.sortOrder ?? 0,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
  res.json(parseHabit(updated));
});

// DELETE /api/habits/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM habits WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
