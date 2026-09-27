import { Router } from 'express';
import db from '../db.js';
import { normalizeFrequency } from '../habitFrequency.js';

const router = Router();

const TRACK_TYPES = ['duration', 'count'];

// Only the two documented units are accepted; anything else falls back to 'duration'
// so legacy clients (and legacy rows) keep working (ADR-008 / ADR-011).
function normalizeTrackType(value) {
  return TRACK_TYPES.includes(value) ? value : 'duration';
}

function parseHabit(row) {
  if (!row) return null;
  return {
    ...row,
    isArchived: !!row.isArchived,
    // The column can hold a JSON string (or a nested one) — never hand the client a string.
    frequency: normalizeFrequency(row.frequency),
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
    'INSERT INTO habits (name, description, color, frequency, trackType, isArchived, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    b.name || '',
    b.description || '',
    b.color || '#10B981',
    JSON.stringify(normalizeFrequency(b.frequency)),
    normalizeTrackType(b.trackType),
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
    'UPDATE habits SET name=?, description=?, color=?, frequency=?, trackType=?, isArchived=?, sortOrder=? WHERE id=?'
  ).run(
    merged.name,
    merged.description,
    merged.color,
    // Self-healing: whatever the column held (even a doubly-encoded string) is rewritten
    // single-encoded, so a habit saved from the UI repairs its own row.
    JSON.stringify(normalizeFrequency(merged.frequency)),
    // merged.trackType already carries the stored value when the body omits it
    normalizeTrackType(merged.trackType),
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
