import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/projects
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects').all();
  res.json(rows);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json(row);
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, color } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO projects (name, color, createdAt) VALUES (?, ?, ?)').run(
    name || '',
    color || '#3788d8',
    now
  );
  const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newProject);
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const { name, color } = req.body;
  db.prepare('UPDATE projects SET name=?, color=? WHERE id=?').run(
    name ?? existing.name,
    color ?? existing.color,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
