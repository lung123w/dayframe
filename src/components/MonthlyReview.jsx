import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FaCheckCircle,
  FaRegCircle,
  FaChevronDown,
  FaChevronRight,
  FaWallet,
  FaCheck,
  FaRedo,
  FaCog,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import { format } from 'date-fns';
import { monthlyReviewService } from '../api';
import { currentMonthKey } from '../utils/lastSaturday.js';
import { ABBREVIATION_GROUPS } from '../utils/abbreviations.js';
import FinancialCards from './FinancialCards';
import './MonthlyReview.css';

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return '';
  const cleaned = String(accountNumber).replace(/\s+/g, '');
  if (cleaned.length < 4) return '****';
  return `****${cleaned.slice(-4)}`;
}

function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-');
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return format(d, 'MMMM yyyy');
}

function groupChecklistBySection(checklist) {
  const sections = {};
  checklist.forEach((item) => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });
  Object.values(sections).forEach((items) => {
    items.sort((a, b) => a.order - b.order);
  });
  return sections;
}

function CollapsibleSection({ title, items, readOnly, onToggle }) {
  const [open, setOpen] = useState(true);
  const completed = items.filter(i => i.completed).length;
  return (
    <div className="mfr-section">
      <button
        type="button"
        className="mfr-section-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {open ? <FaChevronDown /> : <FaChevronRight />}
        <span className="mfr-section-title">{title}</span>
        <span className="mfr-section-progress">{completed}/{items.length}</span>
      </button>
      {open && (
        <ul className="mfr-section-items">
          {items.map((item) => (
            <li key={item.id} className={`mfr-item ${item.completed ? 'mfr-item-done' : ''}`}>
              <div className="mfr-item-row">
                <label className="mfr-item-label">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={readOnly}
                    onChange={() => onToggle(item)}
                    aria-label={item.text}
                  />
                  {item.completed ? (
                    <FaCheckCircle className="mfr-item-check-icon" />
                  ) : (
                    <FaRegCircle className="mfr-item-check-icon" />
                  )}
                  <span className="mfr-item-text">{item.text}</span>
                </label>
                {item.link && (
                  <a
                    className="mfr-item-link"
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open ${item.link}`}
                    onClick={(e) => {
                      // Ensure the click is not absorbed by any parent listener
                      // (e.g. a wrapping label) so the browser follows the href.
                      e.stopPropagation();
                      // Programmatic open as a fallback in case the browser's
                      // popup blocker would have suppressed the implicit
                      // target="_blank" navigation. window.open is the
                      // recommended user-gesture-respecting way to do this.
                      window.open(item.link, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <FaExternalLinkAlt />
                    <span className="mfr-item-link-text">Open</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MonthlyReview({ reviews, financialCards, onDataChange }) {
  const today = useMemo(() => currentMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(today);
  const [review, setReview] = useState(null);
  const [showManageCards, setShowManageCards] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);
  // Per-card hidden state: a Set of cardIds whose number the user has chosen to mask.
  // Default is empty — every card's number is shown in full until the user clicks hide.
  const [hiddenCardIds, setHiddenCardIds] = useState(() => new Set());
  // Add-month form state — default to the next month (typical use case: planning ahead)
  const now = new Date();
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const currentYear = now.getFullYear();
  const [addYear, setAddYear] = useState(nextMonthDate.getFullYear());
  const [addMonth, setAddMonth] = useState(nextMonthDate.getMonth() + 1);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState(null);

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const addYearOptions = (() => {
    const out = [];
    for (let y = currentYear - 1; y <= currentYear + 3; y += 1) out.push(y);
    return out;
  })();
  const selectedMonthKeyForAdd = useCallback(() => {
    return `${addYear}-${String(addMonth).padStart(2, '0')}`;
  }, [addYear, addMonth]);
  const monthKeyExists = useCallback((monthKey) => {
    if (monthKey === today) return true;
    return (reviews || []).some(r => r.monthKey === monthKey);
  }, [reviews, today]);

  const toggleCardVisibility = useCallback((cardId) => {
    setHiddenCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  // Find the review in the loaded list, or fall back to /current
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoadError(null);
        if (selectedMonthKey === today) {
          // Use the live /current endpoint which may create-on-demand
          const data = await monthlyReviewService.getCurrent();
          if (!cancelled) setReview(data);
        } else {
          const fromList = reviews.find(r => r.monthKey === selectedMonthKey);
          if (fromList) {
            setReview(fromList);
          } else {
            const data = await monthlyReviewService.getByMonth(selectedMonthKey);
            if (!cancelled) setReview(data);
          }
        }
      } catch (err) {
        console.error('Failed to load review:', err);
        if (!cancelled) setLoadError(err.message || 'Failed to load review');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedMonthKey, today, reviews]);

  const isCurrent = selectedMonthKey === today;
  const isReadOnly = !isCurrent;

  const handleToggleItem = useCallback(async (item) => {
    if (isReadOnly || !review || !review.id) return;
    setBusy(true);
    try {
      // Optimistic update
      setReview((prev) => {
        if (!prev) return prev;
        const nextChecklist = prev.checklist.map((i) => {
          if (i.id !== item.id) return i;
          return {
            ...i,
            completed: !i.completed,
            completedAt: !i.completed ? new Date().toISOString() : null,
          };
        });
        return { ...prev, checklist: nextChecklist };
      });
      const updated = await monthlyReviewService.toggleChecklistItem(review.id, item.id);
      setReview(updated);
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Toggle failed:', err);
      setReview(review); // revert
    } finally {
      setBusy(false);
    }
  }, [review, isReadOnly, onDataChange]);

  const handleCardFieldChange = useCallback(async (cardId, patch) => {
    if (isReadOnly || !review || !review.id) return;
    setBusy(true);
    try {
      const updated = await monthlyReviewService.updateCardEntry(review.id, cardId, patch);
      setReview(updated);
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Card entry update failed:', err);
    } finally {
      setBusy(false);
    }
  }, [review, isReadOnly, onDataChange]);

  const handleMarkComplete = useCallback(async () => {
    if (isReadOnly || !review || !review.id) return;
    setBusy(true);
    try {
      const updated = await monthlyReviewService.complete(review.id);
      setReview(updated);
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Complete failed:', err);
    } finally {
      setBusy(false);
    }
  }, [review, isReadOnly, onDataChange]);

  const handleReopen = useCallback(async () => {
    if (!review || !review.id) return;
    setBusy(true);
    try {
      const updated = await monthlyReviewService.reopen(review.id);
      setReview(updated);
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Reopen failed:', err);
    } finally {
      setBusy(false);
    }
  }, [review, onDataChange]);

  const handleNotesChange = useCallback(async (notes) => {
    if (isReadOnly || !review || !review.id) return;
    setBusy(true);
    try {
      const updated = await monthlyReviewService.updateNotes(review.id, notes);
      setReview(updated);
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Notes update failed:', err);
    } finally {
      setBusy(false);
    }
  }, [review, isReadOnly, onDataChange]);

  const handleAddMonth = useCallback(async (e) => {
    e.preventDefault();
    const monthKey = `${addYear}-${String(addMonth).padStart(2, '0')}`;
    if (monthKeyExists(monthKey)) {
      setAddError('A review for this month already exists.');
      return;
    }
    setAddBusy(true);
    setAddError(null);
    try {
      const created = await monthlyReviewService.createForMonth(monthKey);
      onDataChange && onDataChange();
      setSelectedMonthKey(monthKey);
      setReview(created);
    } catch (err) {
      console.error('Add month failed:', err);
      setAddError(err.message || 'Failed to create review for the selected month');
    } finally {
      setAddBusy(false);
    }
  }, [addYear, addMonth, monthKeyExists, onDataChange]);

  const groupedChecklist = useMemo(() => {
    if (!review || !review.checklist) return {};
    return groupChecklistBySection(review.checklist);
  }, [review]);

  const sectionNames = useMemo(() => Object.keys(groupedChecklist), [groupedChecklist]);

  // Filter card entries to show only cards that are currently active in the master list.
  // A card that has been deactivated since the review was created is hidden.
  const { visibleCardEntries, hiddenCardEntryCount } = useMemo(() => {
    if (!review || !review.cardEntries) return { visibleCardEntries: [], hiddenCardEntryCount: 0 };
    const cardsById = new Map((financialCards || []).map(c => [c.id, c]));
    const visible = [];
    let hiddenCount = 0;
    for (const entry of review.cardEntries) {
      const card = cardsById.get(entry.cardId);
      if (card && card.active) {
        visible.push(entry);
      } else if (card && !card.active) {
        hiddenCount += 1;
      } else {
        // Card was deleted from the master list — also hide it
        hiddenCount += 1;
      }
    }
    return { visibleCardEntries: visible, hiddenCardEntryCount: hiddenCount };
  }, [review, financialCards]);

  if (showManageCards) {
    return (
      <div className="mfr-root">
        <div className="mfr-header">
          <button className="btn btn-secondary" onClick={() => setShowManageCards(false)}>
            \u2190 Back to Review
          </button>
        </div>
        <FinancialCards
          financialCards={financialCards}
          currentReviewId={review && selectedMonthKey === today ? review.id : null}
          onDataChange={onDataChange}
        />
      </div>
    );
  }

  return (
    <div className="mfr-root">
      <div className="mfr-header">
        <div className="mfr-header-title">
          <h2>Monthly Financial Review</h2>
          <span className="mfr-month-label">{review ? formatMonthLabel(review.monthKey) : 'Loading\u2026'}</span>
        </div>
        <div className="mfr-header-actions">
          {review && (
            <span className={`mfr-status-badge mfr-status-${review.status}`}>
              {review.status === 'completed' ? 'Completed' : review.status === 'in_progress' ? 'In progress' : 'Pending'}
            </span>
          )}
          {review && isCurrent && review.status !== 'completed' && (
            <button className="btn btn-primary" onClick={handleMarkComplete} disabled={busy}>
              <FaCheck /> Mark complete
            </button>
          )}
          {review && isCurrent && review.status === 'completed' && (
            <button className="btn btn-secondary" onClick={handleReopen} disabled={busy}>
              <FaRedo /> Reopen
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowManageCards(true)}>
            <FaCog /> Manage Cards
          </button>
        </div>
      </div>

      <div className="mfr-layout">
        <aside className="mfr-side">
          <h3 className="mfr-side-title">History</h3>
          <form className="mfr-add-month" onSubmit={handleAddMonth}>
            <label className="mfr-add-month-label">
              <span>Year</span>
              <select
                value={addYear}
                onChange={(e) => setAddYear(parseInt(e.target.value, 10))}
                disabled={addBusy}
                aria-label="Year for new month"
              >
                {addYearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="mfr-add-month-label">
              <span>Month</span>
              <select
                value={addMonth}
                onChange={(e) => setAddMonth(parseInt(e.target.value, 10))}
                disabled={addBusy}
                aria-label="Month for new month"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-secondary mfr-add-month-btn"
              disabled={addBusy || monthKeyExists(selectedMonthKeyForAdd())}
              title={monthKeyExists(selectedMonthKeyForAdd()) ? 'A review for this month already exists' : 'Create a review for the selected month'}
            >
              <FaPlus /> Add
            </button>
          </form>
          {addError && <div className="mfr-add-month-error">{addError}</div>}
          <ul className="mfr-side-list">
            <li
              className={`mfr-side-item ${selectedMonthKey === today ? 'active' : ''}`}
              onClick={() => setSelectedMonthKey(today)}
            >
              <FaWallet /> This month
              <span className="mfr-side-month">{formatMonthLabel(today)}</span>
            </li>
            {reviews
              .filter(r => r.monthKey !== today)
              .map((r) => (
                <li
                  key={r.id}
                  className={`mfr-side-item ${selectedMonthKey === r.monthKey ? 'active' : ''}`}
                  onClick={() => setSelectedMonthKey(r.monthKey)}
                >
                  {formatMonthLabel(r.monthKey)}
                  <span className={`mfr-side-status mfr-side-status-${r.status}`}>{r.status}</span>
                </li>
              ))}
          </ul>
        </aside>

        <main className="mfr-main">
          {loadError && <div className="mfr-error">Failed to load: {loadError}</div>}
          {!review && !loadError && <div className="mfr-loading">Loading review\u2026</div>}

          {review && (
            <>
              {isReadOnly && (
                <div className="mfr-readonly-banner">
                  Read-only: this review is for a past month.
                </div>
              )}

              <section className="mfr-checklist">
                {sectionNames.map((name) => (
                  <CollapsibleSection
                    key={name}
                    title={name}
                    items={groupedChecklist[name]}
                    readOnly={isReadOnly}
                    onToggle={handleToggleItem}
                  />
                ))}
              </section>

              <section className="mfr-cards">
                <h3>
                  Payment Tracking
                  {hiddenCardEntryCount > 0 && (
                    <span className="mfr-cards-hidden-note">
                      ({visibleCardEntries.length} of {review.cardEntries.length} shown — {hiddenCardEntryCount} inactive hidden)
                    </span>
                  )}
                </h3>
                {visibleCardEntries.length > 0 ? (
                  <table className="mfr-card-table">
                    <thead>
                      <tr>
                        <th>Card</th>
                        <th>Stmt</th>
                        <th>Amount</th>
                        <th>Due</th>
                        <th>MoneyPro</th>
                        <th>PPS</th>
                        <th>Recorded</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCardEntries.map((entry) => {
                        const isHidden = hiddenCardIds.has(entry.cardId);
                        return (
                        <tr key={entry.cardId} className={entry.statementSaved ? 'mfr-card-row-done' : ''}>
                          <td>
                            <div className="mfr-card-name">{entry.cardName}</div>
                            <div className="mfr-card-institution">{entry.cardInstitution}</div>
                            <div className="mfr-card-account-row">
                              <span className="mfr-card-account">
                                {isHidden ? maskAccountNumber(entry.accountNumber) : (entry.accountNumber || '')}
                              </span>
                              <button
                                type="button"
                                className="mfr-card-toggle"
                                onClick={() => toggleCardVisibility(entry.cardId)}
                                aria-label={isHidden ? 'Show account number' : 'Hide account number'}
                                title={isHidden ? 'Show account number' : 'Hide account number'}
                              >
                                {isHidden ? <FaEye /> : <FaEyeSlash />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!entry.statementSaved}
                              disabled={isReadOnly}
                              onChange={(e) => handleCardFieldChange(entry.cardId, { statementSaved: e.target.checked })}
                              aria-label="Statement saved"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={entry.amount || ''}
                              disabled={isReadOnly}
                              onChange={(e) => handleCardFieldChange(entry.cardId, { amount: e.target.value })}
                              className="mfr-input"
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={entry.dueDate || ''}
                              disabled={isReadOnly}
                              onChange={(e) => handleCardFieldChange(entry.cardId, { dueDate: e.target.value })}
                              className="mfr-input"
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!entry.moneyProVerified}
                              disabled={isReadOnly}
                              onChange={(e) => handleCardFieldChange(entry.cardId, { moneyProVerified: e.target.checked })}
                              aria-label="MoneyPro verified"
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!entry.ppsSetUp}
                              disabled={isReadOnly}
                              onChange={(e) => handleCardFieldChange(entry.cardId, { ppsSetUp: e.target.checked })}
                              aria-label="PPS set up"
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!entry.moneyProRecorded}
                              disabled={isReadOnly}
                              onChange={(e) => handleCardFieldChange(entry.cardId, { moneyProRecorded: e.target.checked })}
                              aria-label="MoneyPro recorded"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={entry.notes || ''}
                              disabled={isReadOnly}
                              onChange={(e) => handleCardFieldChange(entry.cardId, { notes: e.target.value })}
                              className="mfr-input mfr-input-notes"
                              placeholder="Notes"
                            />
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="mfr-empty">
                    {hiddenCardEntryCount > 0
                      ? `All ${hiddenCardEntryCount} card${hiddenCardEntryCount === 1 ? '' : 's'} on this review ${hiddenCardEntryCount === 1 ? 'is' : 'are'} currently inactive. Activate them in Manage Cards to start tracking payments.`
                      : 'No active cards. Add cards in Manage Cards to start tracking payments.'}
                  </p>
                )}
              </section>

              <section className="mfr-notes">
                <h3>Other To-Do / Notes</h3>
                {isReadOnly ? (
                  <div className="mfr-notes-readonly">
                    {review.notes && review.notes.trim().length > 0
                      ? <pre className="mfr-notes-text">{review.notes}</pre>
                      : <p className="mfr-empty">No notes for this month.</p>}
                  </div>
                ) : (
                  <textarea
                    className="mfr-notes-input"
                    value={review.notes || ''}
                    onChange={(e) => setReview((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
                    onBlur={(e) => handleNotesChange(e.target.value)}
                    placeholder="Free-text notes for this month: things to do, ad-hoc to-dos, reminders for next month, etc."
                    rows={6}
                    disabled={busy}
                    aria-label="Monthly notes"
                  />
                )}
              </section>

              <section className="mfr-reference">
                <h3>Reference</h3>
                <div className="mfr-reference-intro">
                  <p>
                    Statement file-name abbreviations (used when saving bank / utility PDFs to disk) and quick links.
                  </p>
                  <p>
                    <a
                      className="mfr-tithe-link"
                      href="https://www.yanfook.org.hk/offering"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open('https://www.yanfook.org.hk/offering', '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <FaExternalLinkAlt />
                      <span>Open Yan Fook Church offering page</span>
                    </a>
                  </p>
                </div>
                {ABBREVIATION_GROUPS.map((group) => (
                  <div key={group.id} className="mfr-abbr-group">
                    <h4>{group.title}</h4>
                    {group.intro && <p className="mfr-abbr-intro">{group.intro}</p>}
                    <table className="mfr-abbr-table">
                      <thead>
                        <tr>
                          <th>Statement Type</th>
                          <th>Abbreviation (file-name prefix)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.abbr}>
                            <td>{item.statement}</td>
                            <td className="mfr-abbr-cell">{item.abbr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
