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
  if (!row) return res.json({ year: yearNum, vision: '', goals: '[]', images: '[]' });
  res.json(row);
});

// PUT / — upsert goals for a year
router.put('/', (req, res) => {
  const { year, vision, goals, images } = req.body;
  if (!year) {
    return res.status(400).json({ error: 'year (number) required' });
  }

  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) {
    return res.status(400).json({ error: 'year must be a number' });
  }

  // Validate and normalise fields
  const visionVal = typeof vision === 'string' ? vision : '';
  let goalsVal;
  if (Array.isArray(goals)) {
    goalsVal = JSON.stringify(goals);
  } else if (typeof goals === 'string') {
    goalsVal = goals;
  } else {
    goalsVal = '[]';
  }
  let imagesVal;
  if (Array.isArray(images)) {
    imagesVal = JSON.stringify(images);
  } else if (typeof images === 'string') {
    imagesVal = images;
  } else {
    imagesVal = '[]';
  }

  const existing = db.prepare('SELECT id FROM yearly_goals WHERE year = ?').get(yearNum);
  if (existing) {
    db.prepare(
      `UPDATE yearly_goals SET vision = ?, goals = ?, images = ?, updatedAt = datetime('now') WHERE id = ?`
    ).run(visionVal, goalsVal, imagesVal, existing.id);
    const updated = db.prepare('SELECT * FROM yearly_goals WHERE id = ?').get(existing.id);
    res.json(updated);
  } else {
    const result = db.prepare(
      'INSERT INTO yearly_goals (year, vision, goals, images) VALUES (?, ?, ?, ?)'
    ).run(yearNum, visionVal, goalsVal, imagesVal);
    const created = db.prepare('SELECT * FROM yearly_goals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  }
});

export default router;
