import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { statementFilingService } from '../api';
import './StatementFiling.css';

// The last step of the Finance Review (design.md D11): show what is sitting in the
// Box, show what a run would do with each file, and run it when — and only when —
// the owner presses the button. There is no scheduler, watcher or background loop
// here, and none anywhere else in the app (owner ruling 2026-09-27, ADR-014): the
// only entry point is the click below. The preview is a pure read on the server.

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The Box and the two destination roots, as text, for the state before any preview
// has been fetched. This is the *display* copy of the server's constants
// (`server/statementSeries.js` BOX_ROOT / DESTINATIONS, design.md D4) — the job
// itself never reads these, and a fetched preview replaces them with the roots the
// server actually resolved, so an operator env override (D13) is never hidden.
const BOX_ROOT = 'C:\\Users\\user\\OneDrive\\0. Box';
const DESTINATION_FALLBACK = [
  { id: 'finance', label: 'Finance statements', root: 'C:\\Users\\user\\OneDrive\\2. Area\\A-Finance\\statement' },
  { id: 'ae', label: 'A&E statements', root: 'C:\\Users\\user\\OneDrive\\2. Area\\A-A & E Family\\Statement' },
];

// Wording rule (D11, re-pointed at the owner's manual-trigger ruling): a verified
// copy is never a failure. The whole frozen clause is kept except its finisher —
// nothing comes back on its own now that no cleaner is scheduled.
const PENDING_REMOVAL_TEXT = 'filed — Box copy still locked by OneDrive; press File them now again in a minute';

function destinationLabel(id) {
  const match = DESTINATION_FALLBACK.find((d) => d.id === id);
  return match ? match.label : id;
}

/** `2026-10` → `Oct`. */
function monthLabel(monthKey) {
  const index = Number(String(monthKey).slice(5, 7)) - 1;
  return MONTH_NAMES[index] || monthKey;
}

/** The plain-English reason a file stays in the Box (D11's `not a PDF` / `not identified as a statement` / …). */
function skipReason(entry) {
  const note = entry && entry.note ? String(entry.note) : '';
  switch (entry && entry.reason) {
    case 'not_pdf':
      return 'not a PDF';
    case 'unreadable_pdf':
      return 'not a readable PDF';
    case 'unclassified':
      if (note === 'month_unreadable') return 'not identified as a statement (the statement month is not readable)';
      if (note === 'empty_text') return 'not identified as a statement (the PDF has no text to read)';
      return 'not identified as a statement';
    case 'needs_text_tool':
      return 'not identified as a statement (the PDF text reader is unavailable)';
    case 'name_conflict':
      return 'destination already has a different file';
    case 'copy_mismatch':
      return 'the copy did not match the Box file, so both copies were kept';
    case 'read_error':
      return note ? `the file could not be read (${note})` : 'the file could not be read';
    case 'outside_scope':
      return 'outside the filing folders';
    default:
      return entry && entry.reason ? String(entry.reason).replace(/_/g, ' ') : 'not filed';
  }
}

/** The one summary line of a run record (D8 counts). */
function summarizeRun(run) {
  const counts = (run && run.counts) || {};
  const n = (value) => (typeof value === 'number' ? value : 0);
  return [
    `filed ${n(counts.filed)}`,
    `already filed ${n(counts.cleaned)}`,
    `still locked in the Box ${n(counts.pendingRemoval)}`,
    `left in the Box ${n(counts.skipped)}`,
  ].join(' · ');
}

/**
 * D9: the stored run record, or null. A missing, unparseable or date-less value is
 * "no run yet" — never an error in the UI.
 */
function parseLastRun(value) {
  let record = value;
  if (typeof record === 'string') {
    try {
      record = JSON.parse(record);
    } catch {
      return null;
    }
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const when = new Date(record.ranAt);
  if (!record.ranAt || Number.isNaN(when.getTime())) return null;
  return { record, when };
}

/** sourceName → what happened to it in this run, for annotating the plan's rows. */
function outcomeIndex(run) {
  const byName = new Map();
  if (!run) return byName;
  const put = (name, text, kind) => {
    if (name) byName.set(name, { text, kind });
  };
  (run.filed || []).forEach((entry) => put(entry.sourceName, 'filed', 'ok'));
  (run.cleaned || []).forEach((entry) => put(entry.sourceName, 'already filed — Box copy removed', 'ok'));
  (run.pendingRemoval || []).forEach((entry) => put(entry.sourceName, PENDING_REMOVAL_TEXT, 'warn'));
  (run.skipped || []).forEach((entry) => put(entry.name, `left in the Box — ${skipReason(entry)}`, 'muted'));
  return byName;
}

export default function StatementFiling() {
  const [lastRun, setLastRun] = useState(null);
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState(null);
  const [planError, setPlanError] = useState(null);
  const [runError, setRunError] = useState(null);
  const [busy, setBusy] = useState(null); // 'check' | 'run' | null

  // Last run (D9/D11 state 6). Absent or unparseable → nothing shown, no error.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const value = await statementFilingService.lastRun();
        if (!cancelled) setLastRun(parseLastRun(value));
      } catch {
        // Never render an error for a setting we merely read.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const check = useCallback(async () => {
    setBusy('check');
    setPlanError(null);
    try {
      const next = await statementFilingService.preview();
      setPlan(next);
      setResult(null);
    } catch (err) {
      setPlanError(err.message || 'Could not read the Box');
    } finally {
      setBusy(null);
    }
  }, []);

  const fileThem = useCallback(async () => {
    setBusy('run');
    setRunError(null);
    try {
      const answer = await statementFilingService.run();
      if (answer && answer.plan) setPlan(answer.plan);
      if (answer && answer.run) {
        setResult(answer.run);
        setLastRun(parseLastRun(answer.run));
      }
    } catch (err) {
      setRunError(err.message || 'Could not file the statements');
    } finally {
      setBusy(null);
    }
  }, []);

  const destinations = plan && Array.isArray(plan.destinations) && plan.destinations.length > 0
    ? plan.destinations.map((d) => ({ id: d.id, label: destinationLabel(d.id), root: d.root }))
    : DESTINATION_FALLBACK;
  const boxRoot = plan && plan.box ? plan.box : BOX_ROOT;

  const actions = useMemo(() => (plan && Array.isArray(plan.actions) ? plan.actions : []), [plan]);
  const reported = (plan && plan.reported) || null;
  const coverage = plan && plan.coverage ? plan.coverage : null;
  const outcomes = useMemo(() => outcomeIndex(result), [result]);

  // Left in the Box = the plan's skips plus anything this run skipped on the way
  // (a file that changed between the preview and the run).
  const skipped = useMemo(() => {
    const byName = new Map();
    (plan && Array.isArray(plan.skipped) ? plan.skipped : []).forEach((entry) => byName.set(entry.name, entry));
    (result && Array.isArray(result.skipped) ? result.skipped : []).forEach((entry) => byName.set(entry.name, entry));
    return [...byName.values()];
  }, [plan, result]);

  const reportedRows = useMemo(() => {
    if (!reported) return [];
    const rows = [];
    (reported.misfiled || []).forEach((entry) => rows.push({
      key: `misfiled-${entry.folder}-${entry.name}`,
      name: entry.name,
      folder: entry.folder,
      sentence: `belongs in ${destinationLabel(entry.expectedFolder)}, not in ${destinationLabel(entry.folder)} — reported only, never moved.`,
    }));
    (reported.nameVariants || []).forEach((entry) => rows.push({
      key: `variant-${entry.folder}-${entry.name}`,
      name: entry.name,
      folder: entry.folder,
      sentence: `the canonical name is ${entry.expectedName} — reported only, never renamed.`,
    }));
    (reported.unknownNames || []).forEach((entry) => rows.push({
      key: `unknown-${entry.folder}-${entry.name}`,
      name: entry.name,
      folder: entry.folder,
      sentence: `matches no statement series — reported only, never moved.`,
    }));
    return rows;
  }, [reported]);

  const busyDoing = busy !== null;

  return (
    <section className="mfr-filing" aria-label="File statements">
      <h3 className="mfr-filing-title">File statements</h3>
      <p className="mfr-filing-intro">
        Files the statement PDFs sitting in the Box into the two statement folders.
        Nothing is moved until you press File them now.
      </p>

      <ul className="mfr-filing-roots">
        <li className="mfr-filing-root">
          <span className="mfr-filing-root-label">Box</span>
          <code className="mfr-filing-path">{boxRoot}</code>
        </li>
        {destinations.map((dest) => (
          <li key={dest.id} className="mfr-filing-root">
            <span className="mfr-filing-root-label">{dest.label}</span>
            <code className="mfr-filing-path">{dest.root}</code>
          </li>
        ))}
      </ul>

      {lastRun && (
        <p className="mfr-filing-lastrun">
          {`Last run: ${format(lastRun.when, 'yyyy-MM-dd HH:mm')} — ${summarizeRun(lastRun.record)}`}
        </p>
      )}

      <div className="mfr-filing-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={check}
          disabled={busyDoing}
        >
          {busy === 'check' ? 'Checking the box…' : plan ? 'Check again' : 'Check the box'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={fileThem}
          disabled={!plan || busyDoing}
        >
          {busy === 'run' ? 'Filing…' : 'File them now'}
        </button>
      </div>

      {(planError || runError) && (
        <div className="mfr-filing-error" role="alert">{runError || planError}</div>
      )}

      {result && (
        <div className="mfr-filing-result">
          <p className="mfr-filing-summary" role="status">{summarizeRun(result)}</p>
          {result.note && <p className="mfr-filing-note">{result.note}</p>}
        </div>
      )}

      {plan && (
        <div className="mfr-filing-plan">
          <div className="mfr-filing-group">
            <h4 className="mfr-filing-group-title">
              Will be filed
              <span className="mfr-filing-count">{actions.length}</span>
            </h4>
            {actions.length === 0 ? (
              <p className="mfr-filing-empty">Nothing to file — the Box holds no statement that is not already filed.</p>
            ) : (
              <ul className="mfr-filing-list">
                {actions.map((action) => {
                  const outcome = outcomes.get(action.sourceName);
                  return (
                    <li key={action.sourceName} className="mfr-filing-row">
                      <span className="mfr-filing-row-main">
                        <code className="mfr-filing-path">{action.sourceName}</code>
                        <span className="mfr-filing-arrow" aria-hidden="true">→</span>
                        <code className="mfr-filing-path mfr-filing-target">{action.targetName}</code>
                      </span>
                      <span className="mfr-filing-row-meta">
                        {destinationLabel(action.destinationId)}
                        {action.kind === 'duplicate_cleanup' ? ' · already filed — only the Box copy is removed' : ''}
                        {action.identifiedBy === 'content' ? ' · recognised from the PDF itself' : ''}
                      </span>
                      {outcome && (
                        <span className={`mfr-filing-outcome mfr-filing-outcome-${outcome.kind}`}>{outcome.text}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mfr-filing-group">
            <h4 className="mfr-filing-group-title">
              Left in the Box
              <span className="mfr-filing-count">{skipped.length}</span>
            </h4>
            {skipped.length === 0 ? (
              <p className="mfr-filing-empty">Every PDF in the Box is accounted for.</p>
            ) : (
              <ul className="mfr-filing-list">
                {skipped.map((entry) => (
                  <li key={entry.name} className="mfr-filing-row">
                    <span className="mfr-filing-row-main">
                      <code className="mfr-filing-path">{entry.name}</code>
                    </span>
                    <span className="mfr-filing-reason">{skipReason(entry)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mfr-filing-group">
            <h4 className="mfr-filing-group-title">
              Reported
              <span className="mfr-filing-count">{reportedRows.length}</span>
            </h4>
            {reportedRows.length === 0 ? (
              <p className="mfr-filing-empty">Nothing odd in the two statement folders this year.</p>
            ) : (
              <ul className="mfr-filing-list">
                {reportedRows.map((row) => (
                  <li key={row.key} className="mfr-filing-row">
                    <span className="mfr-filing-row-main">
                      <code className="mfr-filing-path">{row.name}</code>
                      <span className="mfr-filing-row-meta">{destinationLabel(row.folder)}</span>
                    </span>
                    <span className="mfr-filing-reason">{row.sentence}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mfr-filing-group">
            <h4 className="mfr-filing-group-title">
              Month coverage
              <span className="mfr-filing-count">{coverage ? coverage.year : ''}</span>
            </h4>
            {!coverage || coverage.series.length === 0 ? (
              <p className="mfr-filing-empty">
                No statement of the current year is filed yet, so there is no coverage to show.
              </p>
            ) : (
              <ul className="mfr-filing-list">
                {coverage.series.map((series) => (
                  <li key={series.seriesId} className="mfr-filing-row">
                    <span className="mfr-filing-row-main">
                      <code className="mfr-filing-path">{series.seriesId}</code>
                      <span className="mfr-filing-strip">
                        {MONTH_LETTERS.map((letter, index) => {
                          const monthKey = `${coverage.year}-${String(index + 1).padStart(2, '0')}`;
                          const present = series.monthsPresent.includes(monthKey);
                          return (
                            <span
                              key={monthKey}
                              className={`mfr-filing-cell ${present ? 'mfr-filing-cell-present' : ''}`}
                              data-month={monthKey}
                              data-present={present ? 'true' : 'false'}
                              title={`${MONTH_NAMES[index]} ${coverage.year}: ${present ? 'present' : 'missing'}`}
                            >
                              {letter}
                            </span>
                          );
                        })}
                      </span>
                    </span>
                    <span className="mfr-filing-row-meta">
                      {destinationLabel(series.destinationId)}
                      {series.monthsMissing.length === 0
                        ? ' · all 12 months present'
                        : ` · ${coverage.year} missing: ${series.monthsMissing.map(monthLabel).join(', ')}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
