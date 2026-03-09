import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET / — get objectives for a specific week (query: ?weekStart=YYYY-MM-DD)
router.get('/', (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart) {
    const rows = db.prepare('SELECT * FROM weekly_objectives ORDER BY weekStart DESC LIMIT 12').all();
    return res.json(rows.map(r => ({ ...r, objectives: JSON.parse(r.objectives) })));
  }
  const row = db.prepare('SELECT * FROM weekly_objectives WHERE weekStart = ?').get(weekStart);
  if (!row) return res.json({ weekStart, objectives: [] });
  res.json({ ...row, objectives: JSON.parse(row.objectives) });
});

// PUT / — upsert objectives for a week
router.put('/', (req, res) => {
  const { weekStart, objectives } = req.body;
  if (!weekStart || !Array.isArray(objectives)) {
    return res.status(400).json({ error: 'weekStart (string) and objectives (array) required' });
  }
  const existing = db.prepare('SELECT id FROM weekly_objectives WHERE weekStart = ?').get(weekStart);
  if (existing) {
    db.prepare('UPDATE weekly_objectives SET objectives = ?, updatedAt = datetime(\'now\') WHERE id = ?')
      .run(JSON.stringify(objectives), existing.id);
    const updated = db.prepare('SELECT * FROM weekly_objectives WHERE id = ?').get(existing.id);
    res.json({ ...updated, objectives: JSON.parse(updated.objectives) });
  } else {
    const result = db.prepare('INSERT INTO weekly_objectives (weekStart, objectives) VALUES (?, ?)')
      .run(weekStart, JSON.stringify(objectives));
    const created = db.prepare('SELECT * FROM weekly_objectives WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...created, objectives: JSON.parse(created.objectives) });
  }
});

export default router;
