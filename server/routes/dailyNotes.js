import { Router } from 'express';
import db from '../db.js';

const router = Router();

function parseNote(row) {
  if (!row) return null;
  return { ...row, rolledOverTaskIds: JSON.parse(row.rolledOverTaskIds || '[]') };
}

// GET / — get note for a date (query: ?date=YYYY-MM-DD)
router.get('/', (req, res) => {
  const { date } = req.query;
  if (!date) {
    const rows = db.prepare('SELECT * FROM daily_notes ORDER BY date DESC LIMIT 30').all();
    return res.json(rows.map(parseNote));
  }
  const row = db.prepare('SELECT * FROM daily_notes WHERE date = ?').get(date);
  if (!row) return res.json({ date, highlights: '', rolledOverTaskIds: [] });
  res.json(parseNote(row));
});

// PUT / — upsert note for a date
router.put('/', (req, res) => {
  const { date, highlights, rolledOverTaskIds } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  const existing = db.prepare('SELECT id FROM daily_notes WHERE date = ?').get(date);
  const hl = highlights ?? '';
  const rolled = JSON.stringify(rolledOverTaskIds ?? []);
  if (existing) {
    db.prepare('UPDATE daily_notes SET highlights = ?, rolledOverTaskIds = ?, updatedAt = datetime(\'now\') WHERE id = ?')
      .run(hl, rolled, existing.id);
    const updated = db.prepare('SELECT * FROM daily_notes WHERE id = ?').get(existing.id);
    res.json(parseNote(updated));
  } else {
    const result = db.prepare('INSERT INTO daily_notes (date, highlights, rolledOverTaskIds) VALUES (?, ?, ?)')
      .run(date, hl, rolled);
    const created = db.prepare('SELECT * FROM daily_notes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseNote(created));
  }
});

export default router;
