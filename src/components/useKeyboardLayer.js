import { useCallback, useEffect, useRef } from 'react';
import { GOTO_VIEWS, armGoto, disarmGoto, isGotoArmed, isOverlayOpen, isTypingContext, moveRowFocus } from './keyboard';

/**
 * The document-level half of the keyboard layer — stage 5 of
 * `ui-modernization-calm-canvas` (`design.md` §6 D10).
 *
 * Registered exactly once, by `App.jsx`, and it owns the keys that belong to
 * the app rather than to a row: `j` / `k` (focus moves inside the active list),
 * `g` then a view letter, and `Ctrl/⌘ + K` (the palette). `/` stays where stage
 * 2 put it (`CaptureLine`), `x` / `t` are owned by each focused row, `u` by the
 * undo toast, and `Escape` by every overlay's own dismissable layer — so no
 * handler here duplicates another.
 *
 * The layer never consumes Tab, never preventDefaults when a text field, the
 * rich-text editor or an open overlay has focus, and only ever calls
 * `preventDefault()` on the keys it has actually acted on (design.md §6 rule 3).
 */

/** How long `g` stays armed before the chord is abandoned. */
const GOTO_WINDOW_MS = 1500;

export default function useKeyboardLayer({ onNavigate, onTogglePalette } = {}) {
  const gotoTimerRef = useRef(null);

  const navigate = useCallback((view) => {
    if (onNavigate) onNavigate(view);
  }, [onNavigate]);

  const togglePalette = useCallback(() => {
    if (onTogglePalette) onTogglePalette();
  }, [onTogglePalette]);

  useEffect(() => {
    const clearGoto = () => {
      disarmGoto();
      if (gotoTimerRef.current !== null) {
        clearTimeout(gotoTimerRef.current);
        gotoTimerRef.current = null;
      }
    };

    const handleKeyDown = (event) => {
      // Ctrl/⌘ + K — the palette. The one chord that also works while a field
      // has focus, because it is not a character anyone types.
      if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        togglePalette();
        return;
      }

      // An armed `g` chord resolves before anything else: its second keystroke
      // is the view letter even if a focused row would otherwise claim it
      // (`g` then `t` is "go to Today", not "defer this row").
      if (isGotoArmed()) {
        const view = GOTO_VIEWS[event.key.toLowerCase()];
        clearGoto();
        if (view) {
          event.preventDefault();
          navigate(view);
        }
        return;
      }

      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Rule: a handler must not fire while a text field, the rich-text editor
      // or an open dialog has focus.
      if (isTypingContext(document.activeElement)) return;
      if (isOverlayOpen()) return;

      if (event.key === 'g') {
        armGoto();
        gotoTimerRef.current = setTimeout(clearGoto, GOTO_WINDOW_MS);
        return;
      }

      if (event.key === 'j' || event.key === 'k') {
        const moved = moveRowFocus(event.key === 'j' ? 1 : -1);
        if (moved) event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearGoto();
    };
  }, [navigate, togglePalette]);
}
