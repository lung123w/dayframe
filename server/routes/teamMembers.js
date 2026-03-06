import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/team-members
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM team_members').all();
  res.json(rows);
});

// GET /api/team-members/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Team member not found' });
  res.json(row);
});

// POST /api/team-members
router.post('/', (req, res) => {
  const { name, email, role } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO team_members (name, email, role, createdAt) VALUES (?, ?, ?, ?)').run(
    name || '',
    email || '',
    role || '',
    now
  );
  const newMember = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newMember);
});

// PUT /api/team-members/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Team member not found' });

  const { name, email, role } = req.body;
  db.prepare('UPDATE team_members SET name=?, email=?, role=? WHERE id=?').run(
    name ?? existing.name,
    email ?? existing.email,
    role ?? existing.role,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/team-members/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
