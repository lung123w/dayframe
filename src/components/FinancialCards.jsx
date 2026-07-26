import React, { useState, useCallback } from 'react';
import { FaPlus, FaEdit, FaArrowUp, FaArrowDown, FaCheck, FaTimes } from 'react-icons/fa';
import { financialCardService, monthlyReviewService } from '../api';
import './FinancialCards.css';

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return '';
  const cleaned = String(accountNumber).replace(/\s+/g, '');
  if (cleaned.length < 4) return '****';
  return `****${cleaned.slice(-4)}`;
}

function emptyDraft() {
  return { name: '', institution: '', cardType: 'credit', accountNumber: '' };
}

function CardForm({ initial, onSubmit, onCancel, submitting }) {
  const [draft, setDraft] = useState(initial || emptyDraft());
  const handleChange = (key) => (e) => setDraft(d => ({ ...d, [key]: e.target.value }));
  return (
    <form
      className="fc-form"
      onSubmit={(e) => { e.preventDefault(); onSubmit(draft); }}
    >
      <label>
        <span>Name</span>
        <input type="text" value={draft.name} onChange={handleChange('name')} required />
      </label>
      <label>
        <span>Institution</span>
        <input type="text" value={draft.institution} onChange={handleChange('institution')} />
      </label>
      <label>
        <span>Type</span>
        <select value={draft.cardType} onChange={handleChange('cardType')}>
          <option value="credit">Credit card</option>
          <option value="bank">Bank account</option>
        </select>
      </label>
      <label>
        <span>Account / card number</span>
        <input type="text" value={draft.accountNumber} onChange={handleChange('accountNumber')} />
      </label>
      <div className="fc-form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          <FaTimes /> Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting || !draft.name}>
          <FaCheck /> Save
        </button>
      </div>
    </form>
  );
}

export default function FinancialCards({ financialCards, currentReviewId, onDataChange }) {
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const sortedCards = [...(financialCards || [])].sort((a, b) => {
    if (a.active !== b.active) return b.active - a.active; // active first
    return a.displayOrder - b.displayOrder;
  });

  // Sync the current month's review with the latest card list so newly-added
  // or reactivated cards appear in the Payment Tracking table without
  // requiring the user to reload. If no current review exists, this is a
  // no-op (the next getCurrent() will seed the review from scratch).
  const syncCurrentReview = useCallback(async () => {
    if (!currentReviewId) return;
    try {
      await monthlyReviewService.syncCards(currentReviewId);
    } catch (err) {
      console.error('Sync cards failed:', err);
    }
  }, [currentReviewId]);

  const handleCreate = useCallback(async (draft) => {
    setBusy(true);
    setError(null);
    try {
      await financialCardService.create(draft);
      setAdding(false);
      await syncCurrentReview();
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Create failed:', err);
      setError(err.message || 'Failed to create card');
    } finally {
      setBusy(false);
    }
  }, [onDataChange, syncCurrentReview]);

  const handleUpdate = useCallback(async (id, draft) => {
    setBusy(true);
    setError(null);
    try {
      await financialCardService.update(id, draft);
      setEditingId(null);
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Update failed:', err);
      setError(err.message || 'Failed to update card');
    } finally {
      setBusy(false);
    }
  }, [onDataChange]);

  const handleToggleActive = useCallback(async (card) => {
    setBusy(true);
    setError(null);
    try {
      await financialCardService.update(card.id, { active: card.active ? 0 : 1 });
      await syncCurrentReview();
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Toggle active failed:', err);
      setError(err.message || 'Failed to update card status');
    } finally {
      setBusy(false);
    }
  }, [onDataChange, syncCurrentReview]);

  const handleReorder = useCallback(async (id, direction) => {
    setBusy(true);
    setError(null);
    try {
      await financialCardService.reorder(id, direction);
      onDataChange && onDataChange();
    } catch (err) {
      console.error('Reorder failed:', err);
      setError(err.message || 'Failed to reorder card');
    } finally {
      setBusy(false);
    }
  }, [onDataChange]);

  return (
    <div className="fc-root">
      <div className="fc-header">
        <h2>Manage Cards</h2>
        <button className="btn btn-primary" onClick={() => setAdding(true)} disabled={busy || adding}>
          <FaPlus /> Add Card
        </button>
      </div>
      {error && <div className="fc-error">{error}</div>}

      {adding && (
        <div className="fc-form-wrapper">
          <h3>New card</h3>
          <CardForm
            initial={emptyDraft()}
            submitting={busy}
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      <table className="fc-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Institution</th>
            <th>Type</th>
            <th>Account</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedCards.map((card, idx) => {
            const isEditing = editingId === card.id;
            if (isEditing) {
              return (
                <tr key={card.id}>
                  <td colSpan={6}>
                    <CardForm
                      initial={{ name: card.name, institution: card.institution, cardType: card.cardType, accountNumber: card.accountNumber }}
                      submitting={busy}
                      onSubmit={(draft) => handleUpdate(card.id, draft)}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              );
            }
            return (
              <tr key={card.id} className={card.active ? '' : 'fc-row-inactive'}>
                <td>{card.name}</td>
                <td>{card.institution}</td>
                <td>{card.cardType === 'credit' ? 'Credit' : 'Bank'}</td>
                <td className="fc-mono">{maskAccountNumber(card.accountNumber)}</td>
                <td className="fc-active-cell">
                  <label className="fc-active-toggle">
                    <input
                      type="checkbox"
                      checked={!!card.active}
                      disabled={busy}
                      onChange={() => handleToggleActive(card)}
                      aria-label={card.active ? 'Deactivate card' : 'Activate card'}
                    />
                    <span className={card.active ? 'fc-status-active' : 'fc-status-inactive'}>
                      {card.active ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </td>
                <td className="fc-actions">
                  <button className="btn-icon" onClick={() => setEditingId(card.id)} disabled={busy} title="Edit">
                    <FaEdit />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleReorder(card.id, 'up')}
                    disabled={busy || idx === 0}
                    title="Move up"
                  >
                    <FaArrowUp />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleReorder(card.id, 'down')}
                    disabled={busy || idx === sortedCards.length - 1}
                    title="Move down"
                  >
                    <FaArrowDown />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
