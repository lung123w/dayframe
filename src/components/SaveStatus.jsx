import React from 'react';
import './SaveStatus.css';

/**
 * The one reserved status line every persisting surface shows (design.md §8
 * D12). The position is reserved by CSS so the line never shifts the layout
 * it sits in, and the state is announced politely rather than shouted.
 */
export default function SaveStatus({ status, onRetry, className = '' }) {
  return (
    <span
      className={`save-status${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      data-status={status}
    >
      {status === 'pending' && <span className="save-status-text">Saving…</span>}
      {status === 'saved' && <span className="save-status-text save-status-text--saved">Saved</span>}
      {status === 'error' && (
        <>
          <span className="save-status-text save-status-text--error">Could not save —</span>
          <button type="button" className="save-status-retry" onClick={onRetry}>
            retry
          </button>
        </>
      )}
    </span>
  );
}
