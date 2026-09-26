import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { taskService } from '../api';
import { CAPTURE_DEFAULTS_EVENT, DEFAULT_PRIORITY, PRIORITIES, readCaptureDefaults, writeCaptureDefaults } from './captureDefaults';
import './CaptureLine.css';

/**
 * The shell's one capture line (ADR-012 stage 2; `today-quick-capture` delta).
 *
 * It used to live inside `TodayView.jsx`; it now sits in the shell so it is
 * present on every view, and Today no longer owns a second one.
 *
 * Contract (unchanged): Enter creates a task with `dueDate` = today's Hong Kong
 * date computed at run time, `status: 'pending'`, the input clears, Escape
 * clears, an empty input is ignored, and the new task appears without a reload.
 * New in this stage: the `/` focus key and the D9 capture defaults.
 */

function toLocalDateStr(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

/** True when the element is a text field, the rich-text editor or an open dialog. */
function isTypingContext(el) {
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  if (typeof el.closest !== 'function') return false;
  return Boolean(el.closest('[contenteditable="true"], [contenteditable=""], .ProseMirror, [role="dialog"], [aria-modal="true"]'));
}

export default function CaptureLine({ projects = [], onCaptured }) {
  const [title, setTitle] = useState('');
  const [defaults, setDefaults] = useState(() => readCaptureDefaults());
  const inputRef = useRef(null);

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
      if (document.querySelector('.modal-overlay, [role="dialog"], [aria-modal="true"]')) return;
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

  return (
    <div className="capture-line">
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
  );
}
