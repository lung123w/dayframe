// The statement-filing engine (design.md D3, D5–D10, D12, D13).
//
//   buildPlan(config, now)        pure read: no write, no delete, no mkdir
//   runPlan(config, plan, options) executes exactly the plan it is given
//   resolveConfig(env)            server constants + the D13 sandbox overrides
//
// `config` is `{ box, destinations: [{ id, root }], pdftotext, deleteAttempts,
// deleteRetryDelayMs }`. Nothing here reads an Express request, the database or the
// network: the router is the only thing that knows about any of those, and the
// client's only input is "run now" (D2).
//
// Owner ruling of 2026-09-27 (binding): filing is MANUAL-TRIGGER ONLY. This module
// registers no timer, no watcher and no background loop; the bounded retry below
// lives inside the triggered run.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  BOX_ROOT,
  DESTINATIONS,
  MONTH_KEYS,
  PDFTOTEXT_DEFAULT,
  SERIES,
  canonicalFileName,
  matchSeriesByName,
  monthIndexInName,
  seriesByRecognisePrefix,
} from './statementSeries.js';

const PDF_HEAD_BYTES = 1024;
const PDF_MAGIC = '%PDF-';
const LOCK_ERRNOS = ['EBUSY', 'EPERM', 'EACCES', 'EEXIST'];
const MONTH_NAMES = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

/** A failure the router turns into a 500 with a readable message. */
export class StatementFilingError extends Error {}

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

/** D4 constants + the four D13 dev/test overrides. Never request data. */
export function resolveConfig(env = process.env) {
  const pdftotext = env.DAYFRAME_PDFTOTEXT
    || (fs.existsSync(PDFTOTEXT_DEFAULT) ? PDFTOTEXT_DEFAULT : 'pdftotext');
  return {
    box: env.DAYFRAME_FILING_BOX || BOX_ROOT,
    destinations: [
      { id: 'finance', root: env.DAYFRAME_FILING_FINANCE_ROOT || DESTINATIONS.finance.root },
      { id: 'ae', root: env.DAYFRAME_FILING_AE_ROOT || DESTINATIONS.ae.root },
    ],
    pdftotext,
    deleteAttempts: 2,
    deleteRetryDelayMs: 1200,
  };
}

// ---------------------------------------------------------------------------
// small filesystem helpers
// ---------------------------------------------------------------------------

function errnoOf(err) {
  if (!err) return 'UNKNOWN';
  if (err.code) return String(err.code);
  if (err.status !== undefined) return `exit_${err.status}`;
  return err.name || 'UNKNOWN';
}

function md5OfFile(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

/** `{ exists, md5 }` — a destination is only ever opened for reading (D7.2). */
function destinationState(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return { exists: false, md5: null };
  }
  if (!stat.isFile()) return { exists: true, md5: null };
  try {
    return { exists: true, md5: md5OfFile(file) };
  } catch (err) {
    return { exists: true, md5: null, error: errnoOf(err) };
  }
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** D2.4: every path the job touches must lie inside the Box or a destination root. */
function inScope(config, file) {
  const targets = [config.box, ...config.destinations.map((d) => d.root)];
  return targets.some((root) => isInside(path.resolve(root), path.resolve(file)));
}

function hongKongYear(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric' }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year');
  return Number(year ? year.value : String(now.getFullYear()));
}

// ---------------------------------------------------------------------------
// classification (D5)
// ---------------------------------------------------------------------------

/** Tier 0 — extension, then the `%PDF-` signature in the first 1024 bytes. */
function pdfGate(file, name, readHead) {
  if (!name.toLowerCase().endsWith('.pdf')) return { ok: false, reason: 'not_pdf' };
  let head;
  try {
    head = readHead(file);
  } catch (err) {
    // The bytes could not be read at all — that is a read failure, not a bad magic.
    return { ok: false, reason: 'read_error', note: errnoOf(err) };
  }
  if (!head.toString('latin1').includes(PDF_MAGIC)) return { ok: false, reason: 'unreadable_pdf' };
  return { ok: true };
}

function defaultReadHead(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(PDF_HEAD_BYTES);
    const read = fs.readSync(fd, buf, 0, PDF_HEAD_BYTES, 0);
    return buf.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

/** `18-SEP-2026` / `21 SEP 2026` / `September 05, 2026` / `10-09-26` / `24/01/2026` → `2026-09`. */
function monthKeyFromToken(token) {
  const numeric = token.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4}|\d{2})$/);
  if (numeric) {
    const month = Number(numeric[2]);
    if (month < 1 || month > 12) return null;
    const rawYear = Number(numeric[3]);
    return `${numeric[3].length === 2 ? 2000 + rawYear : rawYear}-${String(month).padStart(2, '0')}`;
  }
  for (const word of token.match(/[A-Za-z]{3,9}/g) || []) {
    const month = MONTH_NAMES[word.toLowerCase()];
    if (!month) continue;
    const year = token.match(/\d{3,4}/);
    if (!year) return null;
    return `${Number(year[0])}-${String(month).padStart(2, '0')}`;
  }
  return null;
}

/** F3: `first-date` scans the whole text, `anchor` scans a window after a literal. */
function readStatementMonth(rule, text) {
  if (!rule) return null;
  let haystack = text;
  if (rule.mode === 'anchor') {
    const at = text.indexOf(rule.literal);
    if (at < 0) return null;
    haystack = text.slice(at, at + (rule.window || 400));
  }
  const match = haystack.match(rule.pattern);
  return match ? monthKeyFromToken(match[0]) : null;
}

function extractText(config, file) {
  // D10: absolute binary, argv array, no shell string, no client value anywhere.
  return execFileSync(config.pdftotext, ['-enc', 'UTF-8', '-layout', file, '-'], {
    timeout: 20000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
    encoding: 'utf8',
  });
}

/**
 * Tier 2 — the name identifies nothing, so read the document. Returns
 * `{ series, statementMonth }` or `{ error }` with error ∈
 * `needs_text_tool` | `no_series_match` | `month_unreadable`.
 */
function identifyFromContent(config, file) {
  let text;
  try {
    text = extractText(config, file);
  } catch (err) {
    if (['ENOENT', 'EACCES', 'ETIMEDOUT', 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'].includes(errnoOf(err))) {
      return { error: 'needs_text_tool', note: errnoOf(err) };
    }
    // The extractor ran but rejected the document; use whatever it managed to print.
    text = typeof err.stdout === 'string' && err.stdout.length > 0 ? err.stdout : '';
  }
  if (typeof text !== 'string' || text.length === 0) return { error: 'no_series_match', note: 'empty_text' };
  // D5: signature match AND month read — both halves must succeed. "First match wins"
  // decides the series, so a signature match whose month cannot be read must NOT
  // capture the file: keep looking for a series that yields both halves, and only when
  // none does report the first signature match as month_unreadable. Live case (probe
  // 2026-09-27): the owner's Hang Seng Integrated Account statement contains a stray
  // `CITIBANK` line, so F2's loose citi_cc signature matches it first while its
  // `[A-Z][a-z]+ \d{2}, \d{4}` month rule cannot read it.
  let monthUnreadable = null;
  for (const series of SERIES) {
    if (!series.content) continue;
    const { require: required, exclude } = series.content;
    if (!required.every((signature) => text.includes(signature))) continue;
    if (exclude && exclude.some((signature) => text.includes(signature))) continue;
    const statementMonth = readStatementMonth(series.month, text);
    if (!statementMonth) {
      if (!monthUnreadable) monthUnreadable = series.id;
      continue;
    }
    return { series, statementMonth };
  }
  if (monthUnreadable) return { error: 'month_unreadable', seriesId: monthUnreadable };
  return { error: 'no_series_match' };
}

// ---------------------------------------------------------------------------
// destination-side report (D12 + F0.3)
// ---------------------------------------------------------------------------

function buildReport(config, year) {
  const misfiled = [];
  const nameVariants = [];
  const unknownNames = [];
  const present = new Map(); // seriesId → Set<monthIndex>

  for (const destination of config.destinations) {
    const yearDir = path.join(destination.root, String(year));
    let entries;
    try {
      entries = fs.readdirSync(yearDir, { withFileTypes: true });
    } catch {
      continue; // no folder for this year yet — nothing to report (D12)
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.pdf')) continue;
      const name = entry.name;
      const series = seriesByRecognisePrefix(name);
      if (!series) {
        unknownNames.push({ folder: destination.id, name });
        continue;
      }
      const monthIndex = monthIndexInName(name);
      if (monthIndex < 0) {
        // F0.3.3 — the destination side reads names only, so a name with no month
        // token is reported even when the document's own text would say otherwise.
        unknownNames.push({ folder: destination.id, name });
        continue;
      }
      if (!present.has(series.id)) present.set(series.id, new Set());
      present.get(series.id).add(monthIndex);
      if (series.destination !== destination.id) {
        // Priority misfiled > nameVariants > unknownNames (F0.3.2). Never moved.
        misfiled.push({ folder: destination.id, name, seriesId: series.id, expectedFolder: series.destination });
        continue;
      }
      const expectedName = `${series.id}_${MONTH_KEYS[monthIndex]}${String(year).slice(-2)}.pdf`;
      if (name.toLowerCase() !== expectedName.toLowerCase()) {
        nameVariants.push({ folder: destination.id, name, expectedName });
      }
    }
  }

  const coverageSeries = SERIES
    .filter((series) => present.has(series.id))
    .map((series) => {
      const months = [...present.get(series.id)].sort((a, b) => a - b);
      return {
        seriesId: series.id,
        destinationId: series.destination,
        monthsPresent: months.map((i) => `${year}-${String(i + 1).padStart(2, '0')}`),
        monthsMissing: MONTH_KEYS
          .map((_, i) => i)
          .filter((i) => !months.includes(i))
          .map((i) => `${year}-${String(i + 1).padStart(2, '0')}`),
      };
    });

  return { misfiled, nameVariants, unknownNames, coverage: { year, series: coverageSeries } };
}

// ---------------------------------------------------------------------------
// buildPlan — the preview (D8)
// ---------------------------------------------------------------------------

/**
 * Reads the Box and both destination roots and returns the plan a run would execute.
 * Pure read: it never writes, deletes or creates a directory, so pressing "check the
 * box" is safe (D3).
 */
export function buildPlan(config, now = new Date()) {
  const box = path.resolve(config.box);
  const scoped = { ...config, box, destinations: config.destinations.map((d) => ({ id: d.id, root: path.resolve(d.root) })) };
  let entries;
  try {
    entries = fs.readdirSync(box, { withFileTypes: true });
  } catch (err) {
    throw new StatementFilingError(`cannot read the Box (${box}): ${errnoOf(err)}`);
  }

  const actions = [];
  const skipped = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue; // folders in the Box are not candidates at all
    const name = entry.name;
    const sourcePath = path.join(box, name);

    const gate = pdfGate(sourcePath, name, defaultReadHead);
    if (!gate.ok) {
      skipped.push({ name, reason: gate.reason, ...(gate.note ? { note: gate.note } : {}) });
      continue;
    }

    let identity = matchSeriesByName(name);
    let identifiedBy = 'filename';
    if (!identity) {
      const byContent = identifyFromContent(scoped, sourcePath);
      if (byContent.error === 'needs_text_tool') {
        skipped.push({ name, reason: 'needs_text_tool', note: byContent.note || 'pdftotext unavailable' });
        continue;
      }
      if (byContent.error) {
        skipped.push({ name, reason: 'unclassified', note: byContent.error });
        continue;
      }
      identity = byContent;
      identifiedBy = 'content';
    }

    let sourceBytes;
    let sourceMd5;
    try {
      const stat = fs.statSync(sourcePath);
      if (!stat.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
      sourceBytes = stat.size;
      sourceMd5 = md5OfFile(sourcePath);
    } catch (err) {
      skipped.push({ name, reason: 'read_error', note: errnoOf(err) });
      continue;
    }

    const destination = scoped.destinations.find((d) => d.id === identity.series.destination);
    const targetName = canonicalFileName(identity.series.id, identity.statementMonth);
    const destinationPath = path.join(destination.root, identity.statementMonth.slice(0, 4));
    const targetPath = path.join(destinationPath, targetName);

    if (!inScope(scoped, sourcePath) || !inScope(scoped, targetPath)) {
      skipped.push({ name, reason: 'outside_scope' });
      continue;
    }

    const existing = destinationState(targetPath);
    let kind;
    if (existing.exists) {
      if (existing.md5 === sourceMd5) {
        kind = 'duplicate_cleanup'; // D6 row 2 — a cleanup, not a skip
      } else {
        skipped.push({ name, reason: 'name_conflict', note: 'destination copy differs' });
        continue;
      }
    } else {
      kind = name === targetName ? 'file' : 'rename_and_file';
    }

    actions.push({
      sourceName: name,
      sourcePath,
      sourceBytes,
      sourceMd5,
      kind,
      seriesId: identity.series.id,
      statementMonth: identity.statementMonth,
      identifiedBy,
      destinationId: destination.id,
      destinationPath,
      targetName,
    });
  }

  const report = buildReport(scoped, hongKongYear(now));

  return {
    generatedAt: now.toISOString(),
    box,
    destinations: scoped.destinations.map((d) => ({ id: d.id, root: d.root })),
    actions,
    skipped,
    reported: {
      misfiled: report.misfiled,
      nameVariants: report.nameVariants,
      unknownNames: report.unknownNames,
    },
    coverage: report.coverage,
    counts: {
      planned: actions.length,
      skipped: skipped.length,
      misfiled: report.misfiled.length,
      nameVariants: report.nameVariants.length,
      unknownNames: report.unknownNames.length,
    },
  };
}

// ---------------------------------------------------------------------------
// runPlan — the run (D6, D7, D8)
// ---------------------------------------------------------------------------

/** D7.4: a bounded retry inside the triggered run. Never a schedule. */
async function removeWithRetry(file, config, options) {
  const maxAttempts = Math.max(1, config.deleteAttempts || 1);
  const waitMs = config.deleteRetryDelayMs || 0;
  const sleep = options.sleep || delay;
  const removeFile = options.removeFile || fs.unlinkSync;
  let attempts = 0;
  let lastError = null;
  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      removeFile(file);
      return { ok: true, attempts };
    } catch (err) {
      lastError = err;
      if (errnoOf(err) === 'ENOENT') return { ok: true, attempts }; // already gone
      if (attempts < maxAttempts) await sleep(waitMs);
    }
  }
  return { ok: false, attempts, error: errnoOf(lastError) };
}

function runNote(run) {
  const locked = run.pendingRemoval.length;
  if (locked === 0) return '';
  const copies = locked === 1 ? 'copy' : 'copies';
  const verb = locked === 1 ? 'is' : 'are';
  return `${locked} Box ${copies} could not be removed because OneDrive still holds `
    + `${locked === 1 ? 'it' : 'them'} — the filed ${copies} ${verb} verified and complete. `
    + 'Press "File them now" again in a minute to finish removing the Box '
    + `${copies}.`;
}

/**
 * Executes exactly the plan it is given, re-verifying each source against the live
 * filesystem first (D3) so a file that changed after the preview cannot lose bytes.
 * Returns the D8 run record. `options` carries test seams only ({ sleep, copyFile,
 * removeFile }) — production passes nothing, and no request value ever reaches them.
 */
export async function runPlan(config, plan, options = {}) {
  const started = Date.now();
  const copyFile = options.copyFile || fs.copyFileSync;
  const scoped = { ...config, box: path.resolve(config.box), destinations: config.destinations.map((d) => ({ id: d.id, root: path.resolve(d.root) })) };

  const run = {
    ranAt: new Date().toISOString(),
    durationMs: 0,
    filed: [],
    cleaned: [],
    pendingRemoval: [],
    skipped: [...(plan.skipped || [])],
    counts: {},
    note: '',
  };

  for (const action of plan.actions || []) {
    const sourcePath = action.sourcePath;
    const destinationPath = action.destinationPath;
    const targetPath = path.join(destinationPath, action.targetName);

    if (!inScope(scoped, sourcePath) || !inScope(scoped, targetPath)) {
      run.skipped.push({ name: action.sourceName, reason: 'outside_scope' });
      continue;
    }

    let sourceMd5;
    try {
      const stat = fs.statSync(sourcePath);
      if (!stat.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
      sourceMd5 = md5OfFile(sourcePath);
    } catch (err) {
      run.skipped.push({ name: action.sourceName, reason: 'read_error', note: errnoOf(err) });
      continue;
    }

    const existing = destinationState(targetPath);
    if (existing.exists && existing.md5 !== sourceMd5) {
      run.skipped.push({ name: action.sourceName, reason: 'name_conflict', note: 'destination copy differs' });
      continue;
    }

    if (!existing.exists) {
      try {
        fs.mkdirSync(destinationPath, { recursive: true });
        copyFile(sourcePath, targetPath);
      } catch (err) {
        run.skipped.push({ name: action.sourceName, reason: 'read_error', note: errnoOf(err) });
        continue;
      }
      let copiedMd5;
      try {
        copiedMd5 = md5OfFile(targetPath);
      } catch (err) {
        run.skipped.push({ name: action.sourceName, reason: 'read_error', note: errnoOf(err) });
        continue;
      }
      if (copiedMd5 !== sourceMd5) {
        // D7.3 — remove the copy we wrote, keep the Box source.
        let note = 'the copy did not verify and was removed; the Box copy is kept';
        try {
          fs.unlinkSync(targetPath);
        } catch (err) {
          note = `the copy did not verify and could not be removed (${errnoOf(err)}); the Box copy is kept`;
        }
        run.skipped.push({ name: action.sourceName, reason: 'copy_mismatch', note });
        continue;
      }
    }

    const removal = await removeWithRetry(sourcePath, scoped, options);
    if (removal.ok) {
      if (existing.exists) {
        run.cleaned.push({
          sourceName: action.sourceName,
          matchedName: action.targetName,
          destinationId: action.destinationId,
          md5: sourceMd5,
          status: 'already_filed',
        });
      } else {
        run.filed.push({
          sourceName: action.sourceName,
          targetName: action.targetName,
          destinationId: action.destinationId,
          md5: sourceMd5,
          status: 'filed',
        });
      }
      continue;
    }

    // The copy is verified; only the removal is pending (D7.4). Never "failed".
    const pending = {
      sourceName: action.sourceName,
      destinationId: action.destinationId,
      md5: sourceMd5,
      reason: 'onedrive_locked',
      attempts: removal.attempts,
    };
    if (!LOCK_ERRNOS.includes(removal.error)) pending.note = removal.error;
    run.pendingRemoval.push(pending);
  }

  run.durationMs = Date.now() - started;
  run.counts = {
    filed: run.filed.length,
    cleaned: run.cleaned.length,
    pendingRemoval: run.pendingRemoval.length,
    skipped: run.skipped.length,
  };
  run.note = runNote(run);
  return run;
}
