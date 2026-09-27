import React, { useEffect } from 'react';
import { FaUndo } from 'react-icons/fa';
import './UndoToast.css';

const UNDO_WINDOW_MS = 5000;

/**
 * The row-level undo affordance of design.md §7 D11 — the same 5-second toast
 * pattern as the habit-delete undo in `HabitTracker.css:215-242`. It is a
 * presentational component so that completing, deferring and reordering a row
 * all share one mechanism; the habit-delete toast itself is deliberately left
 * where it is (card §3.6).
 */
export default function UndoToast({ message, onUndo, onDismiss, duration = UNDO_WINDOW_MS }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss && onDismiss(), duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className="undo-banner" role="status">
      <span className="undo-banner-msg">{message}</span>
      <button type="button" className="undo-banner-btn" onClick={() => onUndo && onUndo()}>
        <FaUndo /> Undo
      </button>
    </div>
  );
}
