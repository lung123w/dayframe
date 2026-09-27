// @vitest-environment node
//
// statement-filing engine + its contract (design.md D5–D10, D12, D13; card t_d2e44c21).
//
// Every case drives a temp sandbox tree built by this file — never the owner's real
// folders. `DAYFRAME_FILING_*` is not read here: the tests hand `buildPlan`/`runPlan`
// an explicit config, which is the same injection point the router uses (D3/D13).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import {
  BOX_ROOT,
  DESTINATIONS,
  PDFTOTEXT_DEFAULT,
  SERIES,
  SERIES_TO_AE,
  canonicalFileName,
  matchSeriesByName,
  monthIndexInName,
  seriesByRecognisePrefix,
} from '../../server/statementSeries.js';
import { buildPlan, resolveConfig, runPlan, StatementFilingError } from '../../server/statementFiling.js';

const HAS_PDFTOTEXT = fs.existsSync(PDFTOTEXT_DEFAULT);
const NOW = new Date('2026-09-27T10:00:00+08:00'); // Hong Kong, fixed → coverage year 2026
const YEAR = 2026;

// ---------------------------------------------------------------------------
// sandbox + fixtures
// ---------------------------------------------------------------------------

function escapePdfText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** A minimal, genuinely parseable PDF whose text layer pdftotext can read. */
function pdfBytes(lines) {
  const content = ['BT', '/F1 12 Tf', '72 720 Td'];
  lines.forEach((line, index) => {
    if (index > 0) content.push('0 -20 Td');
    content.push(`(${escapePdfText(line)}) Tj`);
  });
  content.push('ET');
  const stream = `${content.join('\n')}\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`,
  ];
  const parts = ['%PDF-1.4\n'];
  const offsets = [];
  let offset = Buffer.byteLength(parts[0], 'latin1');
  objects.forEach((body, index) => {
    offsets.push(offset);
    const chunk = `${index + 1} 0 obj\n${body}\nendobj\n`;
    parts.push(chunk);
    offset += Buffer.byteLength(chunk, 'latin1');
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const value of offsets) xref += `${String(value).padStart(10, '0')} 00000 n \n`;
  parts.push(xref, `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`);
  return Buffer.from(parts.join(''), 'latin1');
}

function writePdf(file, lines = ['No statement signature here']) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pdfBytes(lines));
}

function md5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/** names + sizes + content hashes + every directory — catches a stray write or mkdir. */
function fingerprint(root) {
  const rows = [];
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(dir, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        rows.push(`D ${childRel}`);
        walk(child, childRel);
      } else {
        rows.push(`F ${childRel} ${fs.statSync(child).size} ${md5(fs.readFileSync(child))}`);
      }
    }
  };
  walk(root, '');
  return rows.join('\n');
}

let sandbox;
let config;

beforeEach(() => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'df-statement-filing-'));
  sandbox = {
    root,
    box: path.join(root, '0. Box'),
    finance: path.join(root, 'A-Finance', 'statement'),
    ae: path.join(root, 'A-A & E Family', 'Statement'),
  };
  fs.mkdirSync(sandbox.box, { recursive: true });
  fs.mkdirSync(sandbox.finance, { recursive: true });
  fs.mkdirSync(sandbox.ae, { recursive: true });
  config = {
    box: sandbox.box,
    destinations: [
      { id: 'finance', root: sandbox.finance },
      { id: 'ae', root: sandbox.ae },
    ],
    pdftotext: PDFTOTEXT_DEFAULT,
    deleteAttempts: 2,
    deleteRetryDelayMs: 1,
  };
});

afterEach(() => {
  fs.rmSync(sandbox.root, { recursive: true, force: true, maxRetries: 5 });
});

function planNow(overrides = {}) {
  return buildPlan({ ...config, ...overrides }, NOW);
}

function skippedReasons(plan) {
  return plan.skipped.map((entry) => `${entry.name}:${entry.reason}`);
}

// ---------------------------------------------------------------------------
// the frozen tables (F1–F3)
// ---------------------------------------------------------------------------

describe('SERIES table (design.md §F1)', () => {
  it('has 33 rows and exactly the three A&E series', () => {
    expect(SERIES).toHaveLength(33);
    const ae = SERIES.filter((series) => series.destination === 'ae').map((series) => series.id).sort();
    expect(ae).toEqual([...SERIES_TO_AE].sort());
    expect(ae).toEqual(['fam_clp', 'fam_hsb_m_power', 'towngas']);
  });

  it('routes every series to one of the two configured destinations', () => {
    for (const series of SERIES) {
      expect(Object.keys(DESTINATIONS)).toContain(series.destination);
      expect(series.recognise.length).toBeGreaterThan(0);
      expect(series.names.length).toBeGreaterThan(0);
    }
  });

  it('matches each canonical name with exactly one series (no ambiguous patterns)', () => {
    for (const series of SERIES) {
      const canonical = canonicalFileName(series.id, '2026-09');
      const matches = SERIES.filter((other) => other.names.some((pattern) => canonical.match(pattern)));
      expect(matches.map((m) => m.id)).toEqual([series.id]);
    }
  });

  it('reads a canonical name back as the same series and month', () => {
    for (const series of SERIES) {
      const result = matchSeriesByName(canonicalFileName(series.id, '2026-03'));
      expect(result.series.id).toBe(series.id);
      expect(result.statementMonth).toBe('2026-03');
    }
  });

  it('accepts the extra name forms F1 lists for fam_hsb_m_power, fam_clp and citi_cc_rewards', () => {
    expect(matchSeriesByName('fam_hsb_may26.pdf').series.id).toBe('fam_hsb_m_power');
    expect(matchSeriesByName('fam_hsb_may26.pdf').statementMonth).toBe('2026-05');
    expect(matchSeriesByName('am_hsb_m_power_apr25_1.pdf').series.id).toBe('fam_hsb_m_power');
    expect(matchSeriesByName('am_hsb_m_power_apr25_1.pdf').statementMonth).toBe('2025-04');
    expect(matchSeriesByName('fam_clp_fjan26.pdf').series.id).toBe('fam_clp');
    expect(matchSeriesByName('citi_cc__rewards feb25_1.pdf').series.id).toBe('citi_cc_rewards');
  });

  it('leaves a generic name to the content tier and never guesses from a month alone', () => {
    expect(matchSeriesByName('Sep.pdf')).toBeNull();
    expect(matchSeriesByName('boc_cc_2026.pdf')).toBeNull();
    // F5: the trailing number is the day the owner saved it, not a 2030 statement.
    expect(matchSeriesByName('hsb_ia_aug30.pdf')).toBeNull();
    expect(matchSeriesByName('hsb_ia_22mar26.pdf')).toBeNull();
  });

  it('recognises destination-side names by the longest prefix (fam_hsb_joint is not the fam_hsb alias)', () => {
    expect(seriesByRecognisePrefix('fam_hsb_joint_feb26.pdf').id).toBe('fam_hsb_joint');
    expect(seriesByRecognisePrefix('fam_hsb_may26.pdf').id).toBe('fam_hsb_m_power');
    expect(seriesByRecognisePrefix('hsbc_cc_red_sep26.pdf').id).toBe('hsbc_cc_red');
    expect(seriesByRecognisePrefix('hsbc_cc_mile_apr25_1.pdf').id).toBe('hsbc_cc_mile');
    expect(seriesByRecognisePrefix('random_thing.pdf')).toBeNull();
    expect(monthIndexInName('hsb_ia_22mar26.pdf')).toBe(2);
    expect(monthIndexInName('hsb_ia_aug30.pdf')).toBe(7);
    expect(monthIndexInName('tithe_misc.pdf')).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// resolveConfig (D13)
// ---------------------------------------------------------------------------

describe('resolveConfig', () => {
  it('falls back to the D4 server-side constants', () => {
    const resolved = resolveConfig({});
    expect(resolved.box).toBe(BOX_ROOT);
    expect(resolved.destinations.map((d) => d.root)).toEqual([
      'C:\\Users\\user\\OneDrive\\2. Area\\A-Finance\\statement',
      'C:\\Users\\user\\OneDrive\\2. Area\\A-A & E Family\\Statement',
    ]);
    expect(resolved.deleteAttempts).toBe(2);
    expect(resolved.deleteRetryDelayMs).toBe(1200);
    expect(resolved.pdftotext).toBe(HAS_PDFTOTEXT ? PDFTOTEXT_DEFAULT : 'pdftotext');
  });

  it('honours the four dev/test overrides', () => {
    const resolved = resolveConfig({
      DAYFRAME_FILING_BOX: 'C:\\sandbox\\box',
      DAYFRAME_FILING_FINANCE_ROOT: 'C:\\sandbox\\fin',
      DAYFRAME_FILING_AE_ROOT: 'C:\\sandbox\\ae',
      DAYFRAME_PDFTOTEXT: 'C:\\sandbox\\pdftotext.exe',
    });
    expect(resolved.box).toBe('C:\\sandbox\\box');
    expect(resolved.destinations.map((d) => d.root)).toEqual(['C:\\sandbox\\fin', 'C:\\sandbox\\ae']);
    expect(resolved.pdftotext).toBe('C:\\sandbox\\pdftotext.exe');
  });
});

// ---------------------------------------------------------------------------
// Tier 0 — the PDF gate (criterion 3)
// ---------------------------------------------------------------------------

describe('the PDF gate', () => {
  it('reports every non-PDF with reason not_pdf and leaves it in the Box', () => {
    fs.writeFileSync(path.join(sandbox.box, 'UpNote Setup.exe'), 'MZ');
    fs.writeFileSync(path.join(sandbox.box, 'calling[tt].gp'), 'x');
    fs.writeFileSync(path.join(sandbox.box, 'weekly_biz_proposals_2026-09-23.html'), '<html></html>');
    const before = fingerprint(sandbox.root);
    const plan = planNow();
    expect(plan.counts).toEqual({ planned: 0, skipped: 3, misfiled: 0, nameVariants: 0, unknownNames: 0 });
    expect(skippedReasons(plan).sort()).toEqual([
      'UpNote Setup.exe:not_pdf',
      'calling[tt].gp:not_pdf',
      'weekly_biz_proposals_2026-09-23.html:not_pdf',
    ].sort());
    expect(fingerprint(sandbox.root)).toBe(before);
    for (const name of ['UpNote Setup.exe', 'calling[tt].gp', 'weekly_biz_proposals_2026-09-23.html']) {
      expect(fs.existsSync(path.join(sandbox.box, name))).toBe(true);
    }
  });

  it('reports a .pdf without the %PDF- signature as unreadable_pdf', () => {
    fs.writeFileSync(path.join(sandbox.box, 'not-really.pdf'), 'plain text, no magic');
    const plan = planNow();
    expect(skippedReasons(plan)).toEqual(['not-really.pdf:unreadable_pdf']);
    expect(fs.existsSync(path.join(sandbox.box, 'not-really.pdf'))).toBe(true);
  });

  it('ignores directories in the Box instead of calling them files', () => {
    fs.mkdirSync(path.join(sandbox.box, 'a folder'), { recursive: true });
    const plan = planNow();
    expect(plan.skipped).toEqual([]);
    expect(plan.actions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// preview (criteria 1, 9)
// ---------------------------------------------------------------------------

describe('the preview is read-only (criterion 1)', () => {
  it('returns the same plan twice and changes nothing on disk', () => {
    writePdf(path.join(sandbox.box, 'citi_cc_sep26.pdf'));
    writePdf(path.join(sandbox.box, 'boc_cc_dec25.pdf'));
    fs.writeFileSync(path.join(sandbox.box, 'UpNote Setup.exe'), 'MZ');

    const before = fingerprint(sandbox.root);
    const first = planNow();
    const second = planNow();
    expect(fingerprint(sandbox.root)).toBe(before);

    expect(second.actions).toEqual(first.actions);
    expect(second.skipped).toEqual(first.skipped);
    expect(second.counts).toEqual(first.counts);
    expect(second.generatedAt).toBe(first.generatedAt);
  });

  it('never creates the year folder the plan points at', () => {
    writePdf(path.join(sandbox.box, 'boc_cc_dec25.pdf')); // statement month 2025 → 2025 folder
    const plan = planNow();
    expect(plan.actions[0].destinationPath).toBe(path.join(sandbox.finance, '2025'));
    expect(fs.existsSync(path.join(sandbox.finance, '2025'))).toBe(false);
    expect(plan.actions[0].statementMonth).toBe('2025-12');
  });

  it('fails loudly when the Box cannot be read', () => {
    expect(() => buildPlan({ ...config, box: path.join(sandbox.root, 'nope') }, NOW)).toThrow(StatementFilingError);
  });
});

// ---------------------------------------------------------------------------
// Tier 1 — filing by name (criteria 3, 5, 7)
// ---------------------------------------------------------------------------

describe('filing by file name', () => {
  it('files a canonical name into the right folder, byte-verified, source removed', async () => {
    writePdf(path.join(sandbox.box, 'citi_cc_sep26.pdf'), ['CITIBANK', 'September 05, 2026']);
    const plan = planNow();
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      kind: 'file',
      seriesId: 'citi_cc',
      statementMonth: '2026-09',
      identifiedBy: 'filename',
      destinationId: 'finance',
      targetName: 'citi_cc_sep26.pdf',
    });
    expect(plan.actions[0].sourceMd5).toBe(md5(fs.readFileSync(path.join(sandbox.box, 'citi_cc_sep26.pdf'))));

    const run = await runPlan(config, plan);
    expect(run.counts).toEqual({ filed: 1, cleaned: 0, pendingRemoval: 0, skipped: 0 });
    expect(run.filed[0]).toEqual({
      sourceName: 'citi_cc_sep26.pdf',
      targetName: 'citi_cc_sep26.pdf',
      destinationId: 'finance',
      md5: plan.actions[0].sourceMd5,
      status: 'filed',
    });
    const destination = path.join(sandbox.finance, '2026', 'citi_cc_sep26.pdf');
    expect(fs.existsSync(destination)).toBe(true);
    expect(md5(fs.readFileSync(destination))).toBe(plan.actions[0].sourceMd5);
    expect(fs.existsSync(path.join(sandbox.box, 'citi_cc_sep26.pdf'))).toBe(false);
    expect(run.note).toBe('');
  });

  it('renames a variant name to its canonical form on the way in, and routes M Power to A&E', async () => {
    writePdf(path.join(sandbox.box, 'fam_hsb_may26.pdf'));
    const plan = planNow();
    expect(plan.actions[0]).toMatchObject({
      kind: 'rename_and_file',
      seriesId: 'fam_hsb_m_power',
      destinationId: 'ae',
      statementMonth: '2026-05',
      targetName: 'fam_hsb_m_power_may26.pdf',
    });
    const run = await runPlan(config, plan);
    expect(run.counts.filed).toBe(1);
    expect(fs.existsSync(path.join(sandbox.ae, '2026', 'fam_hsb_m_power_may26.pdf'))).toBe(true);
    expect(fs.existsSync(path.join(sandbox.box, 'fam_hsb_may26.pdf'))).toBe(false);
  });

  it('creates the year folder from the STATEMENT month, not from the clock', async () => {
    writePdf(path.join(sandbox.box, 'boc_cc_dec25.pdf'));
    const plan = planNow();
    await runPlan(config, plan);
    expect(fs.existsSync(path.join(sandbox.finance, '2025', 'boc_cc_dec25.pdf'))).toBe(true);
    expect(fs.existsSync(path.join(sandbox.finance, '2026'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// duplicate / conflict (criterion 4)
// ---------------------------------------------------------------------------

describe('duplicate and conflict', () => {
  it('treats an identical destination copy as a cleanup: destination untouched, Box copy removed', async () => {
    const bytes = pdfBytes(['tithe', 'unrelated body']);
    const destination = path.join(sandbox.finance, '2026', 'tithe_sep26.pdf');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
    fs.writeFileSync(path.join(sandbox.box, 'tithe_sep26.pdf'), bytes);
    const destinationBefore = fs.statSync(destination);

    const plan = planNow();
    expect(plan.actions[0].kind).toBe('duplicate_cleanup');
    expect(plan.counts).toEqual({ planned: 1, skipped: 0, misfiled: 0, nameVariants: 0, unknownNames: 0 });

    const run = await runPlan(config, plan);
    expect(run.counts).toEqual({ filed: 0, cleaned: 1, pendingRemoval: 0, skipped: 0 });
    expect(run.cleaned[0]).toMatchObject({ sourceName: 'tithe_sep26.pdf', matchedName: 'tithe_sep26.pdf', status: 'already_filed' });
    expect(run.filed).toEqual([]);
    expect(fs.existsSync(path.join(sandbox.box, 'tithe_sep26.pdf'))).toBe(false);
    expect(md5(fs.readFileSync(destination))).toBe(md5(bytes));
    expect(fs.statSync(destination).mtimeMs).toBe(destinationBefore.mtimeMs);
  });

  it('never overwrites a differing destination copy — nothing is written or deleted', async () => {
    writePdf(path.join(sandbox.box, 'tsfs_sep26.pdf'), ['Box copy']);
    const destination = path.join(sandbox.finance, '2026', 'tsfs_sep26.pdf');
    writePdf(destination, ['filed copy with different bytes']);
    const before = fingerprint(sandbox.root);

    const plan = planNow();
    expect(plan.actions).toEqual([]);
    expect(skippedReasons(plan)).toEqual(['tsfs_sep26.pdf:name_conflict']);

    const run = await runPlan(config, plan);
    expect(run.counts).toEqual({ filed: 0, cleaned: 0, pendingRemoval: 0, skipped: 1 });
    expect(run.skipped[0]).toMatchObject({ name: 'tsfs_sep26.pdf', reason: 'name_conflict' });
    expect(fingerprint(sandbox.root)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// hash verification, locks, read errors (criteria 5, 6)
// ---------------------------------------------------------------------------

describe('the copy is verified before the Box source is removed', () => {
  it('removes the copy it wrote and keeps the Box source when the hashes differ', async () => {
    writePdf(path.join(sandbox.box, 'wewa_sep26.pdf'));
    const plan = planNow();
    const run = await runPlan(config, plan, {
      copyFile: (from, to) => fs.writeFileSync(to, Buffer.from('not the same bytes')),
    });
    expect(run.counts).toEqual({ filed: 0, cleaned: 0, pendingRemoval: 0, skipped: 1 });
    expect(run.skipped[0]).toMatchObject({ name: 'wewa_sep26.pdf', reason: 'copy_mismatch' });
    expect(fs.existsSync(path.join(sandbox.finance, '2026', 'wewa_sep26.pdf'))).toBe(false);
    expect(fs.existsSync(path.join(sandbox.box, 'wewa_sep26.pdf'))).toBe(true);
  });

  it('reports a locked Box copy as pending removal after a bounded retry — never as a failure', async () => {
    writePdf(path.join(sandbox.box, 'hkbn_sep26.pdf'));
    const plan = planNow();
    const sleeps = [];
    const locked = () => {
      throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' });
    };
    const run = await runPlan(config, plan, {
      removeFile: locked,
      sleep: async (ms) => { sleeps.push(ms); },
    });

    expect(run.counts).toEqual({ filed: 0, cleaned: 0, pendingRemoval: 1, skipped: 0 });
    expect(run.pendingRemoval[0]).toMatchObject({
      sourceName: 'hkbn_sep26.pdf',
      destinationId: 'finance',
      reason: 'onedrive_locked',
      attempts: 2,
    });
    expect(sleeps).toEqual([1]); // two attempts, one bounded wait between them
    expect(fs.existsSync(path.join(sandbox.box, 'hkbn_sep26.pdf'))).toBe(true);
    const destination = path.join(sandbox.finance, '2026', 'hkbn_sep26.pdf');
    expect(md5(fs.readFileSync(destination))).toBe(plan.actions[0].sourceMd5);

    const wording = JSON.stringify(run);
    expect(wording.toLowerCase()).not.toContain('failed');
    expect(wording.toLowerCase()).not.toContain('scheduled cleaner');
    expect(run.note).toMatch(/not be removed/i);
    expect(run.note).toMatch(/File them now/i);
    // the singular branch must read as one sentence ("the filed copy is…"), not "the filed copy are…"
    expect(run.note).toContain('the filed copy is verified and complete');
    expect(run.note).not.toContain('the filed copy are');
    expect(run.note).toBe(
      '1 Box copy could not be removed because OneDrive still holds it — '
      + 'the filed copy is verified and complete. '
      + 'Press "File them now" again in a minute to finish removing the Box copy.',
    );
  });

  it('keeps the plural wording when more than one Box copy is locked', async () => {
    writePdf(path.join(sandbox.box, 'hkbn_sep26.pdf'));
    writePdf(path.join(sandbox.box, 'wewa_sep26.pdf'));
    const plan = planNow();
    expect(plan.actions).toHaveLength(2);

    const run = await runPlan(config, plan, {
      removeFile: () => { throw Object.assign(new Error('EPERM: operation not permitted, unlink'), { code: 'EPERM' }); },
      sleep: async () => {},
    });

    expect(run.counts).toEqual({ filed: 0, cleaned: 0, pendingRemoval: 2, skipped: 0 });
    expect(run.note).toContain('2 Box copies could not be removed');
    expect(run.note).toContain('the filed copies are verified and complete');
    expect(run.note).toContain('to finish removing the Box copies.');
    expect(run.note).not.toContain('the filed copies is');
  });

  it('reports an unreadable source as read_error and touches nothing', async () => {
    const plan = {
      skipped: [],
      actions: [{
        sourceName: 'gone.pdf',
        sourcePath: path.join(sandbox.box, 'gone.pdf'),
        kind: 'file',
        destinationId: 'finance',
        destinationPath: path.join(sandbox.finance, '2026'),
        targetName: 'gone.pdf',
      }],
    };
    const before = fingerprint(sandbox.root);
    const run = await runPlan(config, plan);
    expect(run.skipped[0]).toMatchObject({ name: 'gone.pdf', reason: 'read_error', note: 'ENOENT' });
    expect(run.counts).toEqual({ filed: 0, cleaned: 0, pendingRemoval: 0, skipped: 1 });
    expect(fingerprint(sandbox.root)).toBe(before);
  });

  it('re-verifies the source at execution time, so a plan built earlier cannot move changed bytes', async () => {
    const boxFile = path.join(sandbox.box, 'sofi_sep26.pdf');
    writePdf(boxFile, ['first version']);
    const plan = planNow();
    const plannedMd5 = plan.actions[0].sourceMd5;
    writePdf(boxFile, ['second version, written after the preview']);

    const run = await runPlan(config, plan);
    expect(run.counts.filed).toBe(1);
    expect(run.filed[0].md5).not.toBe(plannedMd5);
    const destination = path.join(sandbox.finance, '2026', 'sofi_sep26.pdf');
    expect(md5(fs.readFileSync(destination))).toBe(run.filed[0].md5);
  });
});

// ---------------------------------------------------------------------------
// Tier 2 — content identification (criteria 3, 8)
// ---------------------------------------------------------------------------

describe('content identification', () => {
  it.runIf(HAS_PDFTOTEXT)('identifies a generically named statement from its own text', async () => {
    writePdf(path.join(sandbox.box, 'Sep.pdf'), [
      'Statement of HSBC Red Credit Card Account',
      'Statement date   16 SEP 2026',
    ]);
    const plan = planNow();
    expect(plan.actions[0]).toMatchObject({
      kind: 'rename_and_file',
      seriesId: 'hsbc_cc_red',
      statementMonth: '2026-09',
      identifiedBy: 'content',
      destinationId: 'finance',
      targetName: 'hsbc_cc_red_sep26.pdf',
    });
    const run = await runPlan(config, plan);
    expect(run.counts.filed).toBe(1);
    expect(fs.existsSync(path.join(sandbox.finance, '2026', 'hsbc_cc_red_sep26.pdf'))).toBe(true);
  });

  it.runIf(HAS_PDFTOTEXT)('ignores a loose signature whose month cannot be read and keeps looking (stray CITIBANK in an HSB statement)', async () => {
    writePdf(path.join(sandbox.box, 'hsb_ia_aug30.pdf'), [
      'CITIBANK N.A.', // F2's citi_cc signature is the single loose word CITIBANK
      'CHINESE UNIVERSITY (290)',
      'Integrated Account',
      'MR WONG FAI LUNG   Account Number   21 Aug 2026',
    ]);
    const plan = planNow();
    expect(plan.actions[0]).toMatchObject({
      kind: 'rename_and_file',
      seriesId: 'hsb_ia',
      statementMonth: '2026-08',
      identifiedBy: 'content',
      targetName: 'hsb_ia_aug26.pdf',
    });
  });

  it.runIf(HAS_PDFTOTEXT)('reports month_unreadable only when no series yields both halves', async () => {
    writePdf(path.join(sandbox.box, 'Oct.pdf'), ['CITIBANK', 'nothing date-shaped here']);
    const plan = planNow();
    expect(plan.skipped[0]).toMatchObject({ name: 'Oct.pdf', reason: 'unclassified', note: 'month_unreadable' });
    expect(plan.actions).toEqual([]);
  });

  it.runIf(HAS_PDFTOTEXT)('files a day-suffixed name under its canonical month (F5 hsb_ia_aug30.pdf)', async () => {
    writePdf(path.join(sandbox.box, 'hsb_ia_aug30.pdf'), [
      'CHINESE UNIVERSITY (290)',
      'Integrated Account',
      'MR WONG FAI LUNG   Account Number   21 Aug 2026',
    ]);
    const plan = planNow();
    expect(plan.actions[0]).toMatchObject({
      kind: 'rename_and_file',
      seriesId: 'hsb_ia',
      statementMonth: '2026-08',
      identifiedBy: 'content',
      targetName: 'hsb_ia_aug26.pdf',
    });
    const run = await runPlan(config, plan);
    expect(run.counts.filed).toBe(1);
    expect(fs.existsSync(path.join(sandbox.finance, '2026', 'hsb_ia_aug26.pdf'))).toBe(true);
    expect(fs.existsSync(path.join(sandbox.finance, '2030'))).toBe(false);
  });

  it.runIf(HAS_PDFTOTEXT)('leaves a PDF that matches no series in the Box, reported as unclassified', async () => {
    writePdf(path.join(sandbox.box, 'Anthropic財務SKILL操作手冊.pdf'), ['Product manual', 'Chapter 1']);
    const before = fingerprint(sandbox.root);
    const plan = planNow();
    expect(plan.actions).toEqual([]);
    expect(plan.skipped[0]).toMatchObject({ name: 'Anthropic財務SKILL操作手冊.pdf', reason: 'unclassified', note: 'no_series_match' });
    const run = await runPlan(config, plan);
    expect(run.counts.filed).toBe(0);
    expect(fingerprint(sandbox.root)).toBe(before);
  });

  it('degrades to needs_text_tool when the extractor is unusable, and still files by name', async () => {
    writePdf(path.join(sandbox.box, 'Sep.pdf'), ['anything']);
    writePdf(path.join(sandbox.box, 'citi_cc_sep26.pdf'), ['CITIBANK']);
    const plan = planNow({ pdftotext: path.join(sandbox.root, 'not-installed', 'pdftotext.exe') });
    expect(skippedReasons(plan)).toEqual(['Sep.pdf:needs_text_tool']);
    expect(plan.actions.map((a) => a.sourceName)).toEqual(['citi_cc_sep26.pdf']);

    const run = await runPlan({ ...config, pdftotext: path.join(sandbox.root, 'not-installed', 'pdftotext.exe') }, plan);
    expect(run.counts).toEqual({ filed: 1, cleaned: 0, pendingRemoval: 0, skipped: 1 });
    expect(fs.existsSync(path.join(sandbox.finance, '2026', 'citi_cc_sep26.pdf'))).toBe(true);
    expect(fs.existsSync(path.join(sandbox.box, 'Sep.pdf'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// idempotency (criterion 9)
// ---------------------------------------------------------------------------

describe('idempotency', () => {
  it('reports filed: 0, cleaned: 0 and changes nothing on a second run', async () => {
    writePdf(path.join(sandbox.box, 'tithe_sep26.pdf'));
    writePdf(path.join(sandbox.box, 'citi_cc_sep26.pdf'));
    const first = await runPlan(config, planNow());
    expect(first.counts.filed).toBe(2);

    const afterFirst = fingerprint(sandbox.root);
    const secondPlan = planNow();
    expect(secondPlan.actions).toEqual([]);
    const second = await runPlan(config, secondPlan);
    expect(second.counts).toEqual({ filed: 0, cleaned: 0, pendingRemoval: 0, skipped: 0 });
    expect(fingerprint(sandbox.root)).toBe(afterFirst);
  });
});

// ---------------------------------------------------------------------------
// reported + coverage (criterion 10)
// ---------------------------------------------------------------------------

describe('misfiled, name variants and coverage are reported, never repaired', () => {
  it('reproduces the frozen 2026 destination report and leaves every historic file alone', () => {
    const fin26 = path.join(sandbox.finance, '2026');
    const ae26 = path.join(sandbox.ae, '2026');
    writePdf(path.join(fin26, 'fam_hsb_m_power_jan26.pdf'));
    writePdf(path.join(fin26, 'fam_hsb_m_power_mar26.pdf'));
    writePdf(path.join(fin26, 'hsb_ia_22mar26.pdf'));
    writePdf(path.join(fin26, 'hsb_ia_aug30.pdf'));
    writePdf(path.join(fin26, 'hsbc_cc_sign_jan26.pdf'));
    writePdf(path.join(fin26, 'hsbc_cc_sign_feb26.pdf'));
    writePdf(path.join(ae26, 'fam_hsb_joint_feb26.pdf'));
    writePdf(path.join(ae26, 'wsd_jan26.pdf'));
    writePdf(path.join(ae26, 'fam_hsb_m_power_jul_26.pdf'));
    writePdf(path.join(ae26, 'fam_hsb_may26.pdf'));
    // non-year material in the root must never be scanned (F6.9)
    fs.writeFileSync(path.join(sandbox.finance, 'e-service2.pdf'), 'not a year folder');
    fs.mkdirSync(path.join(sandbox.finance, 'Worship'), { recursive: true });

    const before = fingerprint(sandbox.root);
    const plan = planNow();

    expect(plan.reported.misfiled).toEqual([
      { folder: 'finance', name: 'fam_hsb_m_power_jan26.pdf', seriesId: 'fam_hsb_m_power', expectedFolder: 'ae' },
      { folder: 'finance', name: 'fam_hsb_m_power_mar26.pdf', seriesId: 'fam_hsb_m_power', expectedFolder: 'ae' },
      { folder: 'ae', name: 'fam_hsb_joint_feb26.pdf', seriesId: 'fam_hsb_joint', expectedFolder: 'finance' },
      { folder: 'ae', name: 'wsd_jan26.pdf', seriesId: 'wsd', expectedFolder: 'finance' },
    ]);
    expect(plan.reported.nameVariants).toEqual([
      { folder: 'finance', name: 'hsb_ia_22mar26.pdf', expectedName: 'hsb_ia_mar26.pdf' },
      { folder: 'finance', name: 'hsb_ia_aug30.pdf', expectedName: 'hsb_ia_aug26.pdf' },
      { folder: 'ae', name: 'fam_hsb_m_power_jul_26.pdf', expectedName: 'fam_hsb_m_power_jul26.pdf' },
      { folder: 'ae', name: 'fam_hsb_may26.pdf', expectedName: 'fam_hsb_m_power_may26.pdf' },
    ]);
    expect(plan.reported.unknownNames).toEqual([]);
    expect(plan.counts).toEqual({ planned: 0, skipped: 0, misfiled: 4, nameVariants: 4, unknownNames: 0 });

    expect(plan.coverage.year).toBe(YEAR);
    expect(plan.coverage.series).toEqual([
      {
        seriesId: 'fam_hsb_m_power',
        destinationId: 'ae',
        monthsPresent: ['2026-01', '2026-03', '2026-05', '2026-07'],
        monthsMissing: ['2026-02', '2026-04', '2026-06', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'],
      },
      {
        seriesId: 'hsb_ia',
        destinationId: 'finance',
        monthsPresent: ['2026-03', '2026-08'],
        monthsMissing: ['2026-01', '2026-02', '2026-04', '2026-05', '2026-06', '2026-07', '2026-09', '2026-10', '2026-11', '2026-12'],
      },
      {
        seriesId: 'hsbc_cc_sign',
        destinationId: 'finance',
        monthsPresent: ['2026-01', '2026-02'],
        monthsMissing: ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'],
      },
      {
        seriesId: 'fam_hsb_joint',
        destinationId: 'finance',
        monthsPresent: ['2026-02'],
        monthsMissing: ['2026-01', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'],
      },
      {
        seriesId: 'wsd',
        destinationId: 'finance',
        monthsPresent: ['2026-01'],
        monthsMissing: ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'],
      },
    ]);
    expect(fingerprint(sandbox.root)).toBe(before); // nothing moved, renamed or created
  });

  it('reports a series with no readable month and a name matching no series under unknownNames', () => {
    const fin26 = path.join(sandbox.finance, '2026');
    writePdf(path.join(fin26, 'tithe_misc.pdf')); // right series, no month token (F0.3.3)
    writePdf(path.join(fin26, 'random_thing.pdf')); // no series at all
    const plan = planNow();
    expect(plan.reported.unknownNames).toEqual([
      { folder: 'finance', name: 'random_thing.pdf' },
      { folder: 'finance', name: 'tithe_misc.pdf' },
    ]);
    expect(plan.counts.unknownNames).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// the job carries no automation and no network (criteria 12, owner ruling)
// ---------------------------------------------------------------------------

describe('the job is manual-trigger only and local only', () => {
  const sources = ['server/statementFiling.js', 'server/statementSeries.js', 'server/routes/statementFiling.js'];

  it.each(sources)('%s registers no scheduler, watcher or network client', (relative) => {
    const source = fs.readFileSync(path.resolve(process.cwd(), relative), 'utf8');
    for (const forbidden of [
      'setInterval', 'fs.watch', 'watchFile', 'node-cron', 'cron',
      "fetch(", 'node:http', 'node:https', 'node:net', 'node:dns', 'axios', 'scheduled cleaner',
    ]) {
      expect(source, `${relative} must not contain ${forbidden}`).not.toContain(forbidden);
    }
  });
});
