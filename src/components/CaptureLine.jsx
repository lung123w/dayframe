import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { taskService } from '../api';
import { CAPTURE_DEFAULTS_EVENT, DEFAULT_PRIORITY, PRIORITIES, readCaptureDefaults, writeCaptureDefaults } from './captureDefaults';
import { isTypingContext, isOverlayOpen } from './keyboard';
import './CaptureLine.css';

/**
 * The one capture line, in two variants (ADR-015; `today-quick-capture` delta).
 *
 * `variant="shell"` (the default) is the shell chrome line that the five views
 * other than Today render: its project and priority controls are always visible.
 *
 * `variant="row"` is Today's instance — the same component, the same props and
 * the same code path, rendered as the first row of the Today task list. It stays
 * a quiet single line until focus enters it, then *renders* the project/priority
 * controls: while collapsed they are absent from the DOM rather than hidden, so
 * there is no hidden tab stop (design.md D3). Where the row is too narrow to hold
 * those controls and the input on one line they leave the flow instead of wrapping
 * — the row stays one line tall and the first task row below never moves (D5;
 * `CaptureLine.css`). It carries no `data-kbd-row` and
 * no `.tv-task` class, so `j`/`k` still start on the first task row (D4).
 *
 * Contract (unchanged): Enter creates a task with `dueDate` = today's Hong Kong
 * date computed at run time, `status: 'pending'`, the input clears, Escape
 * clears, an empty input is ignored, and the new task appears without a reload.
 * Also unchanged: the `/` focus key and the D9 capture defaults.
 *
 * The `/` key is the one entry of the stage-5 key map that stays here rather
 * than in `useKeyboardLayer` (it needs this component's input ref); it reads
 * the layer's shared `isTypingContext` / `isOverlayOpen` rules from
 * `keyboard.js` so the guard cannot drift from the rest of the map.
 */

function toLocalDateStr(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export default function CaptureLine({ projects = [], onCaptured, variant = 'shell' }) {
  const [title, setTitle] = useState('');
  const [defaults, setDefaults] = useState(() => readCaptureDefaults());
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  const isRow = variant === 'row';

  // Re-read the stored preference whenever any capture or edit writes it (D9).
  useEffect(() => {
    const sync = () => setDefaults(readCaptureDefaults());
    window.addEventListener(CAPTURE_DEFAULTS_EVENT, sync);
    return () => window.removeEventListener(CAPTURE_DEFAULTS_EVENT, sync);
  }, []);

  // The `/` focus key (stage 2 only — the full keyboard layer is stage 5).
  // It must not fire while a text field, the rich-text editor or an open
  // dialog has focus, and the key must not be typed into the field.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== '/' || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingContext(document.activeElement)) return;
      if (isOverlayOpen()) return;
      event.preventDefault();
      if (inputRef.current) inputRef.current.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDefaultsChange = useCallback((field, value) => {
    setDefaults((previous) => {
      const next = { ...previous, [field]: value };
      writeCaptureDefaults(next);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(async (event) => {
    if (event.key === 'Enter') {
      const trimmed = title.trim();
      if (!trimmed) return;

      // Read the stored preference at capture time (D9) so an edit made
      // elsewhere in the session is picked up without a remount.
      const stored = readCaptureDefaults();
      setDefaults(stored);

      const payload = { title: trimmed, dueDate: toLocalDateStr(new Date()), status: 'pending' };
      if (stored.projectId !== null) payload.projectId = stored.projectId;
      if (stored.priority !== DEFAULT_PRIORITY) payload.priority = stored.priority;

      await taskService.create(payload);
      setTitle('');
      if (onCaptured) onCaptured();
    } else if (event.key === 'Escape') {
      setTitle('');
    }
  }, [title, onCaptured]);

  // The row variant's focus reveal (design.md D3). React's `onFocus`/`onBlur`
  // are the bubbling `focusin`/`focusout`, so both live on the wrapper: focus
  // entering any part of the row expands it, and it collapses only when focus
  // leaves the wrapper entirely — `relatedTarget` containment is what keeps the
  // row open while the user moves from the input to the Project select.
  const rowFocusProps = isRow
    ? {
        onFocus: () => setExpanded(true),
        onBlur: (event) => {
          if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
          setExpanded(false);
        },
      }
    : {};

  return (
    <div className={isRow ? 'capture-line capture-line--row' : 'capture-line'} {...rowFocusProps}>
      <FaPlus className="capture-line-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        className="capture-line-input"
        type="text"
        placeholder="Capture a task… (press Enter)"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Quick capture task"
      />
      {/* Rendered only while the row variant is expanded; the shell variant
          always shows them. The revealed wrapper is added and removed next to
          the input, so the input itself is never remounted by the toggle.

          The pair is wrapped so the row variant can take it out of the flow when
          the row is too narrow to hold it and the input on one line; the wrapper
          is `display: contents` everywhere else, so the flat flex row (and the
          shell strip, whose own fields it also wraps) lays out unchanged. */}
      {(!isRow || expanded) && (
        <div className="capture-line-cluster">
          <label className="capture-line-field">
            <span className="capture-line-label">Project</span>
            <select
              className="capture-line-select"
              aria-label="Capture project"
              value={defaults.projectId === null ? '' : String(defaults.projectId)}
              onChange={(event) => handleDefaultsChange('projectId', event.target.value === '' ? null : Number(event.target.value))}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          <label className="capture-line-field">
            <span className="capture-line-label">Priority</span>
            <select
              className="capture-line-select"
              aria-label="Capture priority"
              value={defaults.priority}
              onChange={(event) => handleDefaultsChange('priority', event.target.value)}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
