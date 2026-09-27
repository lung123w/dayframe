import { Router } from 'express';
import db from '../db.js';
import { buildPlan, resolveConfig, runPlan } from '../statementFiling.js';

// /api/statement-filing — the Finance Review tab's final step (design.md D1).
//
// Both endpoints are PARAMETERLESS (D2, security rule, binding):
//   GET  /preview  → the read-only plan
//   POST /run      → executes it and journals the run in settings['statementFiling.lastRun']
// A query parameter on either, or any key in the POST body, is answered with 400 and
// nothing is touched. Only the operator's process environment can redirect the folders
// (D13); no request value ever reaches a subprocess argument or a filesystem path.

const router = Router();
const NO_INPUT = 'statement filing takes no input';
const LAST_RUN_KEY = 'statementFiling.lastRun';

function hasQuery(req) {
  return Object.keys(req.query || {}).length > 0;
}

function bodyHasInput(body) {
  if (body === undefined || body === null) return false;
  if (typeof body !== 'object' || Array.isArray(body)) return true;
  return Object.keys(body).length > 0;
}

function failure(res, error, action) {
  const message = error && error.message ? error.message : `statement filing ${action} failed`;
  res.status(500).json({ error: message });
}

// GET /preview — read-only: no write, no delete, no mkdir (D3).
router.get('/preview', (req, res) => {
  if (hasQuery(req)) return res.status(400).json({ error: NO_INPUT });
  try {
    res.json(buildPlan(resolveConfig()));
  } catch (error) {
    failure(res, error, 'preview');
  }
});

// POST /run — executes the plan, then journals it. No scheduler, no watcher: the
// only way anything runs is this request (owner ruling 2026-09-27).
router.post('/run', async (req, res) => {
  if (hasQuery(req) || bodyHasInput(req.body)) return res.status(400).json({ error: NO_INPUT });
  try {
    const config = resolveConfig();
    const plan = buildPlan(config);
    const run = await runPlan(config, plan);
    persistLastRun(run);
    res.json({ run, plan });
  } catch (error) {
    failure(res, error, 'run');
  }
});

/** D9 — one settings row, overwritten each run. No new table, no migration. */
function persistLastRun(run) {
  db.prepare(`
    INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(LAST_RUN_KEY, JSON.stringify(run));
}

export default router;
