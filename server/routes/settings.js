import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /:key — get a setting value by key
router.get('/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
  if (!row) return res.json({ key: req.params.key, value: null });
  let parsed;
  try { parsed = JSON.parse(row.value); } catch { parsed = row.value; }
  res.json({ key: req.params.key, value: parsed });
});

// PUT /:key — upsert a setting value
router.put('/:key', (req, res) => {
  const { value } = req.body;
  const serialized = JSON.stringify(value ?? null);
  db.prepare(`
    INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(req.params.key, serialized);
  res.json({ key: req.params.key, value: value ?? null });
});

export default router;
