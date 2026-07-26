import { Router } from 'express';
import db from '../db.js';

const router = Router();

const SEED_CARDS = [
  { name: 'Hang Seng Integrated Account', institution: 'Hang Seng Bank', cardType: 'bank', accountNumber: '290 697630 882' },
  { name: 'HSBC One Account', institution: 'HSBC', cardType: 'bank', accountNumber: '551 662 042883' },
  { name: 'Hang Seng Credit Card', institution: 'Hang Seng Bank', cardType: 'credit', accountNumber: '4548 8920 2973 7963' },
  { name: 'HSBC VISA Signature', institution: 'HSBC', cardType: 'credit', accountNumber: '4966 0405 1670 4244' },
  { name: 'HSBC RED', institution: 'HSBC', cardType: 'credit', accountNumber: '5289 4600 0709 2734' },
  { name: 'Citibank Octopus', institution: 'Citibank', cardType: 'credit', accountNumber: '4617 2670 0862 2260' },
  { name: 'BEA World Master', institution: 'BEA', cardType: 'credit', accountNumber: '5452 2903 0029 1597' },
  { name: 'BEA Titanium', institution: 'BEA', cardType: 'credit', accountNumber: '5408 2051 0112 9551' },
  { name: 'BOC Credit Card', institution: 'BOC', cardType: 'credit', accountNumber: '6251 7228 8072' },
];

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM financial_cards').get().n;
  if (count > 0) return;
  const insert = db.prepare(
    'INSERT INTO financial_cards (name, institution, cardType, accountNumber, displayOrder, active) VALUES (?, ?, ?, ?, ?, 1)'
  );
  SEED_CARDS.forEach((c, i) => {
    insert.run(c.name, c.institution, c.cardType, c.accountNumber, i);
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
