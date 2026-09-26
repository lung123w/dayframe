import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Optional seed list, deliberately NOT in tracked source: this repo is public and
// the list carries real account numbers (see .dev_context/DECISION_LOG.md POL-006).
// File: <repo>/data/seed-cards.json — an array of { name, institution, cardType, accountNumber }.
// Absent, unreadable or non-array => nothing is seeded.
const SEED_FILE = path.join(__dirname, '..', '..', 'data', 'seed-cards.json');

function readSeedCards() {
  if (!fs.existsSync(SEED_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    if (!Array.isArray(parsed)) {
      console.warn(`[financial-cards] ${SEED_FILE} is not a JSON array — seeding nothing`);
      return [];
    }
    return parsed.filter((card) => card && typeof card === 'object' && !Array.isArray(card));
  } catch (err) {
    console.warn(`[financial-cards] cannot read ${SEED_FILE} (${err.message}) — seeding nothing`);
    return [];
  }
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM financial_cards').get().n;
  if (count > 0) return;
  const seedCards = readSeedCards();
  if (seedCards.length === 0) return;
  const insert = db.prepare(
    'INSERT INTO financial_cards (name, institution, cardType, accountNumber, displayOrder, active) VALUES (?, ?, ?, ?, ?, 1)'
  );
  seedCards.forEach((c, i) => {
    insert.run(
      String(c.name ?? ''),
      String(c.institution ?? ''),
      String(c.cardType ?? 'credit'),
      String(c.accountNumber ?? ''),
      i
    );
  });
}

// GET / — list all ordered by displayOrder
router.get('/', (req, res) => {
  seedIfEmpty();
  const rows = db.prepare('SELECT * FROM financial_cards ORDER BY displayOrder ASC, id ASC').all();
  res.json(rows);
});

// GET /:id — get one
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM financial_cards WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Card not found' });
  res.json(row);
});

// POST / — create new card
router.post('/', (req, res) => {
  const { name, institution, cardType, accountNumber } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(displayOrder), -1) AS m FROM financial_cards').get().m;
  const result = db.prepare(
    'INSERT INTO financial_cards (name, institution, cardType, accountNumber, displayOrder, active) VALUES (?, ?, ?, ?, ?, 1)'
  ).run(
    name || '',
    institution || '',
    cardType || 'credit',
    accountNumber || '',
    maxOrder + 1
  );
  const created = db.prepare('SELECT * FROM financial_cards WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// PUT /:id — update card
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM financial_cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Card not found' });
  const { name, institution, cardType, accountNumber, displayOrder, active } = req.body;
  db.prepare(
    `UPDATE financial_cards
       SET name = ?, institution = ?, cardType = ?, accountNumber = ?, displayOrder = ?, active = ?, updatedAt = datetime('now')
       WHERE id = ?`
  ).run(
    name ?? existing.name,
    institution ?? existing.institution,
    cardType ?? existing.cardType,
    accountNumber ?? existing.accountNumber,
    displayOrder ?? existing.displayOrder,
    active ?? existing.active,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM financial_cards WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /:id/deactivate — soft-delete
router.post('/:id/deactivate', (req, res) => {
  const existing = db.prepare('SELECT * FROM financial_cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Card not found' });
  db.prepare('UPDATE financial_cards SET active = 0, updatedAt = datetime(\'now\') WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM financial_cards WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /:id/reorder — swap displayOrder with another card
router.post('/:id/reorder', (req, res) => {
  const { direction } = req.body; // 'up' | 'down'
  const card = db.prepare('SELECT * FROM financial_cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  const all = db.prepare('SELECT * FROM financial_cards ORDER BY displayOrder ASC, id ASC').all();
  const idx = all.findIndex(c => c.id === card.id);
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= all.length) {
    return res.json(card);
  }
  const target = all[targetIdx];
  // Swap displayOrder values
  db.prepare('UPDATE financial_cards SET displayOrder = ? WHERE id = ?').run(target.displayOrder, card.id);
  db.prepare('UPDATE financial_cards SET displayOrder = ? WHERE id = ?').run(card.displayOrder, target.id);
  const updated = db.prepare('SELECT * FROM financial_cards WHERE id = ?').get(req.params.id);
  res.json(updated);
});

export default router;
