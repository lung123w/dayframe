import { Router } from 'express';
import db from '../db.js';
import { getLastSaturdayOfMonth, currentMonthKey } from '../../src/utils/lastSaturday.js';
import { buildReviewFromTemplate } from '../../src/utils/checklistTemplate.js';

const router = Router();

function deserialize(row) {
  return {
    ...row,
    checklist: JSON.parse(row.checklist),
    cardEntries: JSON.parse(row.cardEntries),
  };
}

function defaultReview(monthKey, reviewDate) {
  return {
    monthKey,
    year: parseInt(monthKey.split('-')[0], 10),
    month: parseInt(monthKey.split('-')[1], 10),
    reviewDate,
    status: 'pending',
    checklist: [],
    cardEntries: [],
    notes: '',
    completedAt: null,
  };
}

function getActiveCards() {
  return db.prepare('SELECT * FROM financial_cards WHERE active = 1 ORDER BY displayOrder ASC, id ASC').all();
}

function buildReviewForMonth(monthKey) {
  const cards = getActiveCards();
  return buildReviewFromTemplate(monthKey, new Date(), cards);
}

function persistReview(review) {
  const existing = db.prepare('SELECT id FROM monthly_reviews WHERE monthKey = ?').get(review.monthKey);
  const checklistJson = JSON.stringify(review.checklist || []);
  const cardEntriesJson = JSON.stringify(review.cardEntries || []);
  const notes = review.notes || '';
  if (existing) {
    db.prepare(
      `UPDATE monthly_reviews
         SET year = ?, month = ?, reviewDate = ?, status = ?, checklist = ?, cardEntries = ?, notes = ?, completedAt = ?, updatedAt = datetime('now')
         WHERE id = ?`
    ).run(
      review.year,
      review.month,
      review.reviewDate,
      review.status,
      checklistJson,
      cardEntriesJson,
      notes,
      review.completedAt || null,
      existing.id
    );
    return db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(existing.id);
  }
  const result = db.prepare(
    `INSERT INTO monthly_reviews (monthKey, year, month, reviewDate, status, checklist, cardEntries, notes, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    review.monthKey,
    review.year,
    review.month,
    review.reviewDate,
    review.status,
    checklistJson,
    cardEntriesJson,
    notes,
    review.completedAt || null
  );
  return db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(result.lastInsertRowid);
}

// GET / — list all ordered by monthKey desc
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM monthly_reviews ORDER BY monthKey DESC').all();
  res.json(rows.map(deserialize));
});

// GET /current — get-or-create the review for the current month
router.get('/current', (req, res) => {
  const now = new Date();
  const monthKey = currentMonthKey(now);
  let row = db.prepare('SELECT * FROM monthly_reviews WHERE monthKey = ?').get(monthKey);
  if (!row) {
    const review = buildReviewForMonth(monthKey);
    row = persistReview(review);
  }
  res.json(deserialize(row));
});

// GET /?monthKey=YYYY-MM — get single review; if not found, return default
router.get('/by-month', (req, res) => {
  const { monthKey } = req.query;
  if (!monthKey) return res.status(400).json({ error: 'monthKey required' });
  const row = db.prepare('SELECT * FROM monthly_reviews WHERE monthKey = ?').get(monthKey);
  if (!row) {
    const [yStr, mStr] = monthKey.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const reviewDate = getLastSaturdayOfMonth(year, month);
    return res.json(defaultReview(monthKey, reviewDate));
  }
  res.json(deserialize(row));
});

// POST / — create a new review for an arbitrary month (including future months).
// Body: { monthKey: "YYYY-MM" }. Returns 409 if a review already exists.
router.post('/', (req, res) => {
  const { monthKey } = req.body;
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return res.status(400).json({ error: 'monthKey must be in YYYY-MM format' });
  }
  const existing = db.prepare('SELECT id FROM monthly_reviews WHERE monthKey = ?').get(monthKey);
  if (existing) {
    return res.status(409).json({ error: 'Review for this month already exists', id: existing.id });
  }
  const review = buildReviewForMonth(monthKey);
  const row = persistReview(review);
  res.status(201).json(deserialize(row));
});

// PUT / — upsert a full review
router.put('/', (req, res) => {
  const { monthKey, year, month, reviewDate, status, checklist, cardEntries, notes, completedAt } = req.body;
  if (!monthKey) return res.status(400).json({ error: 'monthKey required' });
  const existing = db.prepare('SELECT id FROM monthly_reviews WHERE monthKey = ?').get(monthKey);
  if (existing) {
    db.prepare(
      `UPDATE monthly_reviews
         SET year = ?, month = ?, reviewDate = ?, status = ?, checklist = ?, cardEntries = ?, notes = ?, completedAt = ?, updatedAt = datetime('now')
         WHERE id = ?`
    ).run(
      year,
      month,
      reviewDate,
      status || 'pending',
      JSON.stringify(checklist || []),
      JSON.stringify(cardEntries || []),
      notes || '',
      completedAt || null,
      existing.id
    );
    return res.json(deserialize(db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(existing.id)));
  }
  // Creating new
  const result = db.prepare(
    `INSERT INTO monthly_reviews (monthKey, year, month, reviewDate, status, checklist, cardEntries, notes, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    monthKey,
    year,
    month,
    reviewDate,
    status || 'pending',
    JSON.stringify(checklist || []),
    JSON.stringify(cardEntries || []),
    notes || '',
    completedAt || null
  );
  res.status(201).json(deserialize(db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(result.lastInsertRowid)));
});

// PATCH /:id/checklist/:itemId — toggle a checklist item
router.patch('/:id/checklist/:itemId', (req, res) => {
  const row = db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Review not found' });
  const checklist = JSON.parse(row.checklist);
  const idx = checklist.findIndex(i => i.id === req.params.itemId);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  const item = checklist[idx];
  if (item.completed) {
    item.completed = false;
    item.completedAt = null;
  } else {
    item.completed = true;
    item.completedAt = new Date().toISOString();
  }
  // Bump status to in_progress if it was pending
  let status = row.status;
  if (status === 'pending') status = 'in_progress';
  db.prepare(
    'UPDATE monthly_reviews SET checklist = ?, status = ?, updatedAt = datetime(\'now\') WHERE id = ?'
  ).run(JSON.stringify(checklist), status, row.id);
  res.json(deserialize(db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(row.id)));
});

// PATCH /:id/card-entry/:cardId — update a single card entry
router.patch('/:id/card-entry/:cardId', (req, res) => {
  const row = db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Review not found' });
  const cardEntries = JSON.parse(row.cardEntries);
  const idx = cardEntries.findIndex(e => String(e.cardId) === String(req.params.cardId));
  if (idx === -1) return res.status(404).json({ error: 'Card entry not found' });
  const allowed = ['statementSaved', 'amount', 'dueDate', 'moneyProVerified', 'ppsSetUp', 'moneyProRecorded', 'notes'];
  for (const key of allowed) {
    if (key in req.body) {
      cardEntries[idx][key] = req.body[key];
    }
  }
  let status = row.status;
  if (status === 'pending') status = 'in_progress';
  db.prepare(
    'UPDATE monthly_reviews SET cardEntries = ?, status = ?, updatedAt = datetime(\'now\') WHERE id = ?'
  ).run(JSON.stringify(cardEntries), status, row.id);
  res.json(deserialize(db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(row.id)));
});

// POST /:id/complete — mark review complete
router.post('/:id/complete', (req, res) => {
  const row = db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Review not found' });
  const completedAt = new Date().toISOString();
  db.prepare(
    'UPDATE monthly_reviews SET status = ?, completedAt = ?, updatedAt = datetime(\'now\') WHERE id = ?'
  ).run('completed', completedAt, row.id);
  res.json(deserialize(db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(row.id)));
});

// POST /:id/reopen — clear completed status
router.post('/:id/reopen', (req, res) => {
  const row = db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Review not found' });
  db.prepare(
    'UPDATE monthly_reviews SET status = ?, completedAt = NULL, updatedAt = datetime(\'now\') WHERE id = ?'
  ).run('in_progress', row.id);
  res.json(deserialize(db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(row.id)));
});

// PATCH /:id/notes — update the top-level notes (free-text "other to-do" section)
router.patch('/:id/notes', (req, res) => {
  const row = db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Review not found' });
  const notes = typeof req.body.notes === 'string' ? req.body.notes : '';
  let status = row.status;
  if (status === 'pending' && notes.trim().length > 0) status = 'in_progress';
  db.prepare(
    'UPDATE monthly_reviews SET notes = ?, status = ?, updatedAt = datetime(\'now\') WHERE id = ?'
  ).run(notes, status, row.id);
  res.json(deserialize(db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(row.id)));
});

// POST /:id/sync-cards — re-sync the review's cardEntries with the current active
// cards from the financial_cards master list. New active cards are added with
// empty fields; inactive cards are removed. Existing entries' field values
// are preserved. The review's status is left untouched.
router.post('/:id/sync-cards', (req, res) => {
  const row = db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Review not found' });
  const activeCards = db.prepare(
    'SELECT * FROM financial_cards WHERE active = 1 ORDER BY displayOrder ASC, id ASC'
  ).all();
  const existingEntries = JSON.parse(row.cardEntries);
  const existingByCardId = new Map(existingEntries.map(e => [String(e.cardId), e]));
  const nextEntries = activeCards.map(c => {
    const prev = existingByCardId.get(String(c.id));
    if (prev) {
      // Preserve any field values the user already entered; refresh name/account
      return {
        ...prev,
        cardName: c.name,
        cardInstitution: c.institution,
        accountNumber: c.accountNumber,
      };
    }
    return {
      cardId: c.id,
      cardName: c.name,
      cardInstitution: c.institution,
      accountNumber: c.accountNumber,
      statementSaved: false,
      amount: '',
      dueDate: '',
      moneyProVerified: false,
      ppsSetUp: false,
      moneyProRecorded: false,
      notes: '',
    };
  });
  db.prepare(
    'UPDATE monthly_reviews SET cardEntries = ?, updatedAt = datetime(\'now\') WHERE id = ?'
  ).run(JSON.stringify(nextEntries), row.id);
  res.json(deserialize(db.prepare('SELECT * FROM monthly_reviews WHERE id = ?').get(row.id)));
});

export default router;
