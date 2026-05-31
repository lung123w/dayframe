import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET / — get all key events (optionally filtered by date range)
// ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = db.prepare(
      'SELECT * FROM key_events WHERE date >= ? AND date <= ? ORDER BY date ASC'
    ).all(from, to);
  } else {
    rows = db.prepare('SELECT * FROM key_events ORDER BY date ASC').all();
  }
  res.json(rows);
});

// GET /:id — get a single key event
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM key_events WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Key event not found' });
  res.json(row);
});

// POST / — create a key event
router.post('/', (req, res) => {
  const { title, date, description = '', category = '' } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }
  const result = db.prepare(
    'INSERT INTO key_events (title, date, description, category) VALUES (?, ?, ?, ?)'
  ).run(title.trim(), date, description, category);
  const created = db.prepare('SELECT * FROM key_events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /:id — update a key event
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM key_events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Key event not found' });

  const title = req.body.title !== undefined ? req.body.title : existing.title;
  const date = req.body.date !== undefined ? req.body.date : existing.date;
  const description = req.body.description !== undefined ? req.body.description : existing.description;
  const category = req.body.category !== undefined ? req.body.category : existing.category;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  db.prepare(
    `UPDATE key_events SET title = ?, date = ?, description = ?, category = ?, updatedAt = datetime('now') WHERE id = ?`
  ).run(title.trim(), date, description, category, req.params.id);

  const updated = db.prepare('SELECT * FROM key_events WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /:id — delete a key event
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM key_events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Key event not found' });
  db.prepare('DELETE FROM key_events WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
