import React, { useEffect } from 'react';
import { FaUndo } from 'react-icons/fa';
import { isTypingContext } from './keyboard';
import './UndoToast.css';

const UNDO_WINDOW_MS = 5000;

/**
 * The row-level undo affordance of design.md §7 D11 — the same 5-second toast
 * pattern as the habit-delete undo in `HabitTracker.css:215-242`. It is a
 * presentational component so that completing, deferring and reordering a row
 * all share one mechanism; the habit-delete toast itself is deliberately left
 * where it is (card §3.6).
 *
 * Stage 5 gives it the `u` key: the toast is the undo affordance, so it is the
 * toast that owns the shortcut — while it is up, `u` runs the same callback its
 * button runs. That keeps one mechanism (no second undo stack) and means `u`
 * works even after the row it acted on has left the list and taken focus with
 * it.
 */
export default function UndoToast({ message, onUndo, onDismiss, duration = UNDO_WINDOW_MS }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss && onDismiss(), duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'u' || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented) return;
      if (isTypingContext(document.activeElement)) return;
      event.preventDefault();
      if (onUndo) onUndo();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onUndo]);

  return (
    <div className="undo-banner" role="status">
      <span className="undo-banner-msg">{message}</span>
      <button type="button" className="undo-banner-btn" onClick={() => onUndo && onUndo()}>
        <FaUndo /> Undo
      </button>
    </div>
  );
}
