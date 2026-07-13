import { Router } from 'express';
import db from '../db.js';

const router = Router();

const DEFAULT_DOC = (weekStart) => ({
  weekStart,
  cleanupTasks: [],
  gratitudeEntries: [],
  reflectionAnswers: {},
  weeklyGoals: [],
  syncFlags: {},
});

// GET / — get review document for a specific week (query: ?weekStart=YYYY-MM-DD)
router.get('/', (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart) {
    const rows = db.prepare('SELECT * FROM weekly_reviews ORDER BY weekStart DESC LIMIT 12').all();
    return res.json(rows.map(r => ({
      ...r,
      cleanupTasks: JSON.parse(r.cleanupTasks),
      gratitudeEntries: JSON.parse(r.gratitudeEntries),
      reflectionAnswers: JSON.parse(r.reflectionAnswers),
      weeklyGoals: JSON.parse(r.weeklyGoals),
      syncFlags: JSON.parse(r.syncFlags),
    })));
  }
  const row = db.prepare('SELECT * FROM weekly_reviews WHERE weekStart = ?').get(weekStart);
  if (!row) return res.json(DEFAULT_DOC(weekStart));
  res.json({
    ...row,
    cleanupTasks: JSON.parse(row.cleanupTasks),
    gratitudeEntries: JSON.parse(row.gratitudeEntries),
    reflectionAnswers: JSON.parse(row.reflectionAnswers),
    weeklyGoals: JSON.parse(row.weeklyGoals),
    syncFlags: JSON.parse(row.syncFlags),
  });
});

// PUT / — upsert review document for a week
router.put('/', (req, res) => {
  const {
    weekStart,
    cleanupTasks = [],
    gratitudeEntries = [],
    reflectionAnswers = {},
    weeklyGoals = [],
    syncFlags = {},
  } = req.body;
  if (!weekStart) {
    return res.status(400).json({ error: 'weekStart (string) required' });
  }
  const existing = db.prepare('SELECT id FROM weekly_reviews WHERE weekStart = ?').get(weekStart);
  const serialized = {
    cleanupTasks: JSON.stringify(cleanupTasks),
    gratitudeEntries: JSON.stringify(gratitudeEntries),
    reflectionAnswers: JSON.stringify(reflectionAnswers),
    weeklyGoals: JSON.stringify(weeklyGoals),
    syncFlags: JSON.stringify(syncFlags),
  };
  if (existing) {
    db.prepare(
      `UPDATE weekly_reviews
       SET cleanupTasks = ?, gratitudeEntries = ?, reflectionAnswers = ?, weeklyGoals = ?, syncFlags = ?, updatedAt = datetime('now')
       WHERE id = ?`
    ).run(
      serialized.cleanupTasks,
      serialized.gratitudeEntries,
      serialized.reflectionAnswers,
      serialized.weeklyGoals,
      serialized.syncFlags,
      existing.id
    );
    const updated = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(existing.id);
    res.json({
      ...updated,
      cleanupTasks: JSON.parse(updated.cleanupTasks),
      gratitudeEntries: JSON.parse(updated.gratitudeEntries),
      reflectionAnswers: JSON.parse(updated.reflectionAnswers),
      weeklyGoals: JSON.parse(updated.weeklyGoals),
      syncFlags: JSON.parse(updated.syncFlags),
    });
  } else {
    const result = db.prepare(
      `INSERT INTO weekly_reviews (weekStart, cleanupTasks, gratitudeEntries, reflectionAnswers, weeklyGoals, syncFlags)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      weekStart,
      serialized.cleanupTasks,
      serialized.gratitudeEntries,
      serialized.reflectionAnswers,
      serialized.weeklyGoals,
      serialized.syncFlags
    );
    const created = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...created,
      cleanupTasks: JSON.parse(created.cleanupTasks),
      gratitudeEntries: JSON.parse(created.gratitudeEntries),
      reflectionAnswers: JSON.parse(created.reflectionAnswers),
      weeklyGoals: JSON.parse(created.weeklyGoals),
      syncFlags: JSON.parse(created.syncFlags),
    });
  }
});

export default router;
