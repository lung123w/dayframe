import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { SHORTCUTS, focusCaptureLine } from './keyboard';
import './CommandPalette.css';

/**
 * The command palette — the LAST slice of stage 5 of
 * `ui-modernization-calm-canvas`, and deliberately droppable (`design.md` §6:
 * "deleting its component, its mount and its key entry must leave the rest
 * working").
 *
 * Its whole surface is: one component, one mount in `App.jsx`, and the
 * `Ctrl/⌘ + K` entry in `useKeyboardLayer`. It reads the six frozen
 * `activeView` values and the one action the key map already exposes (focusing
 * the capture line); it adds no router, no view key and no app state beyond the
 * boolean that opens it. Its footer is the in-app discoverability affordance
 * for the key map.
 *
 * The Radix dialog underneath supplies the focus trap, Escape dismissal and
 * focus return — the same primitive stage 4 adopted in `AppDialog.jsx`.
 */

const VIEW_COMMANDS = [
  { id: 'today', label: 'Go to Today', hint: 'g t', view: 'today' },
  { id: 'planner', label: 'Go to Week', hint: 'g w', view: 'planner' },
  { id: 'habits', label: 'Go to Habits', hint: 'g h', view: 'habits' },
  { id: 'review', label: 'Go to Review', hint: 'g r', view: 'review' },
  { id: 'finance', label: 'Go to Finance', hint: 'g f', view: 'finance' },
  { id: 'projects', label: 'Go to Projects', hint: 'g p', view: 'projects' },
  { id: 'capture', label: 'Focus the capture line', hint: '/', action: 'capture' },
];

const LIST_ID = 'command-palette-list';

function PaletteBody({ activeView, onRun }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const commands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return VIEW_COMMANDS;
    return VIEW_COMMANDS.filter((command) => command.label.toLowerCase().includes(needle));
  }, [query]);

  const active = commands[Math.min(activeIndex, commands.length - 1)];
  const activeId = active ? `command-palette-option-${active.id}` : undefined;

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (commands.length ? (index + 1) % commands.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (commands.length ? (index - 1 + commands.length) % commands.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active) onRun(active);
    }
  };

  return (
    <>
      <Dialog.Title className="command-palette-title">Command palette</Dialog.Title>

      <input
        type="text"
        className="command-palette-input"
        placeholder="Type a command or a view name…"
        aria-label="Command palette search"
        role="combobox"
        aria-expanded="true"
        aria-controls={LIST_ID}
        aria-activedescendant={activeId}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        autoFocus
      />

      <ul className="command-palette-list" id={LIST_ID} role="listbox" aria-label="Commands">
        {commands.length === 0 ? (
          <li className="command-palette-empty">No matching command</li>
        ) : (
          commands.map((command, index) => (
            <li
              key={command.id}
              id={`command-palette-option-${command.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`command-palette-item${index === activeIndex ? ' command-palette-item--active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onRun(command)}
            >
              <span className="command-palette-item-label">{command.label}</span>
              {command.view === activeView ? (
                <span className="command-palette-current">Current</span>
              ) : null}
              <kbd className="command-palette-item-key">{command.hint}</kbd>
            </li>
          ))
        )}
      </ul>

      {/* Discoverability: the frozen key map lives in the app, not only in a doc. */}
      <div className="command-palette-footer">
        <span className="command-palette-footer-title">Keyboard</span>
        <ul className="command-palette-shortcuts">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.keys} className="command-palette-shortcut">
              <kbd>{shortcut.keys}</kbd>
              <span>{shortcut.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default function CommandPalette({ open, onClose, activeView, onNavigate }) {
  const invokerRef = useRef(null);
  // What the close should focus instead of the invoker, when the chosen command
  // itself moves focus (reading it inside onCloseAutoFocus rather than calling
  // `.focus()` before the dialog unmounts keeps Radix from stealing it back).
  const focusAfterRef = useRef(null);

  useEffect(() => {
    if (open && typeof document !== 'undefined') {
      const element = document.activeElement;
      invokerRef.current = element && element !== document.body ? element : null;
      focusAfterRef.current = null;
    }
  }, [open]);

  const run = (command) => {
    focusAfterRef.current = command.action === 'capture' ? 'capture' : null;
    onClose();
    if (command.view && onNavigate) onNavigate(command.view);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="command-palette-overlay">
          <Dialog.Content
            className="command-palette"
            aria-label="Command palette"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = focusAfterRef.current;
              focusAfterRef.current = null;
              if (target === 'capture') {
                focusCaptureLine();
                invokerRef.current = null;
                return;
              }
              const invoker = invokerRef.current;
              invokerRef.current = null;
              if (
                invoker
                && typeof invoker.focus === 'function'
                && typeof document !== 'undefined'
                && document.contains(invoker)
              ) {
                invoker.focus();
              }
            }}
          >
            <PaletteBody activeView={activeView} onRun={run} />
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
