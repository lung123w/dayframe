/**
 * The keyboard layer's shared helpers — stage 5 of `ui-modernization-calm-canvas`
 * (`design.md` §6 D10; ADR-012).
 *
 * This module is deliberately presentation-free and state-free: the frozen key
 * map, the "am I allowed to fire" test, and the two DOM operations the layer
 * needs (move focus between rows, act on the focused row). Every handler in the
 * app — `useKeyboardLayer`, `CaptureLine`, `UndoToast` and each list surface's
 * row — reads the same rules from here, so the "must not fire while typing"
 * guard cannot drift between call sites.
 *
 * A row opts into the layer with `tabIndex={0}` + `data-kbd-row`, and its
 * surface marks the container with `data-kbd-list`. Nothing else is required:
 * no context, no router, no app-level state (`design.md` §6 rule 3).
 */

/** A focusable list row, and the container that scopes `j`/`k` to one list. */
export const ROW_SELECTOR = '[data-kbd-row]';
export const LIST_SELECTOR = '[data-kbd-list]';

/**
 * `g` is a chord: it arms the next keystroke for a view letter. The flag lives
 * here rather than inside a component because the row handlers have to know
 * about it too — while the chord is armed, `t` means "go to Today", not "defer
 * this row", and the row must stand down (`handleRowKeyDown` reads this).
 */
let gotoArmed = false;

export function armGoto() {
  gotoArmed = true;
}

export function disarmGoto() {
  gotoArmed = false;
}

export function isGotoArmed() {
  return gotoArmed;
}

/**
 * `g` then one of these switches view. The six `activeView` values are the
 * frozen ones — this map adds no new key (`design.md` §1).
 */
export const GOTO_VIEWS = {
  t: 'today',
  w: 'planner',
  h: 'habits',
  r: 'review',
  f: 'finance',
  p: 'projects',
};

/**
 * The key map as displayed in the command palette's footer — the in-app
 * discoverability affordance `design.md` §6 asks for.
 */
export const SHORTCUTS = [
  { keys: '/', label: 'Focus the capture line' },
  { keys: 'j / k', label: 'Move the focused row down / up' },
  { keys: 'x', label: 'Toggle completion of the focused row' },
  { keys: 't', label: 'Defer the focused row to tomorrow' },
  { keys: 'u', label: 'Undo the last row action (5 s)' },
  { keys: 'g → t / w / h / r / f / p', label: 'Today · Week · Habits · Review · Finance · Projects' },
  { keys: 'Escape', label: 'Close the open overlay' },
  { keys: 'Ctrl / ⌘ + K', label: 'Open the command palette' },
];

/**
 * True when the element is a text field, a select, the rich-text editor or the
 * inside of an open dialog/overlay — i.e. the layer must stay out of the way.
 * `CaptureLine` used to own a private copy of this test (stage 2); it reads
 * this one now so the rule has a single definition.
 */
export function isTypingContext(el) {
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  if (typeof el.closest !== 'function') return false;
  return Boolean(el.closest('[contenteditable="true"], [contenteditable=""], .ProseMirror, [role="dialog"], [aria-modal="true"]'));
}

/**
 * True while an overlay owns the screen. `@radix-ui/react-popover` gives its
 * content `role="dialog"` and `@radix-ui/react-dialog` gives its content
 * `role="dialog"` + `aria-modal`, so one selector covers dialogs, popovers and
 * the command palette. Escape is the exception: overlays handle it themselves.
 */
export function isOverlayOpen() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[role="dialog"], [aria-modal="true"]'));
}

/** The row that currently has focus, if any. */
export function focusedRow() {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  if (!active || typeof active.closest !== 'function') return null;
  return active.closest(ROW_SELECTOR);
}

/**
 * The rows of the active list: the focused row's own list when there is one,
 * otherwise the first list on the screen (so `j` starts navigating from cold).
 */
export function activeListRows() {
  if (typeof document === 'undefined') return [];
  const current = focusedRow();
  const list = current
    ? current.closest(LIST_SELECTOR)
    : document.querySelector(LIST_SELECTOR);
  if (!list) return [];
  return Array.from(list.querySelectorAll(ROW_SELECTOR));
}

/**
 * Move focus one row down (`direction = 1`) or up (`-1`) inside the active
 * list. With nothing focused it lands on the first row (down) or the last
 * (up). Returns the newly focused element, or null when there is no row to
 * move to.
 */
export function moveRowFocus(direction) {
  const rows = activeListRows();
  if (!rows.length) return null;
  const current = focusedRow();
  const index = current ? rows.indexOf(current) : -1;
  let next;
  if (index === -1) {
    next = direction > 0 ? 0 : rows.length - 1;
  } else {
    next = Math.min(rows.length - 1, Math.max(0, index + direction));
  }
  const target = rows[next];
  if (!target) return null;
  if (typeof target.focus === 'function') target.focus();
  if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'nearest' });
  return target;
}

/**
 * The row-scoped half of the key map: `x` toggles the focused row, `t` defers
 * it to tomorrow. The surface supplies the two callbacks — the row already owns
 * them for its pointer path, so the keyboard path drives the same handlers and
 * therefore the same core state (and the same undo offer).
 *
 * `j`, `k`, `/`, `u`, `g …`, `Escape` and `Ctrl/⌘+K` are NOT handled here: they
 * belong to the list/document, not to a single row.
 */
export function handleRowKeyDown(event, { onToggle, onDefer } = {}) {
  if (event.defaultPrevented) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isGotoArmed()) return false;
  if (isTypingContext(event.target)) return false;
  if (event.key === 'x' && onToggle) {
    event.preventDefault();
    onToggle();
    return true;
  }
  if (event.key === 't' && onDefer) {
    event.preventDefault();
    onDefer();
    return true;
  }
  return false;
}

/** Focus the shell's capture input (the `/` key's target), from anywhere. */
export function focusCaptureLine() {
  if (typeof document === 'undefined') return false;
  const input = document.querySelector('.capture-line-input');
  if (!input || typeof input.focus !== 'function') return false;
  input.focus();
  return true;
}

/**
 * Tomorrow's date as `YYYY-MM-DD` in the machine's local (Hong Kong) calendar —
 * computed at run time, never hardcoded (CONV-003).
 */
export function tomorrowDateStr() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0'),
  ].join('-');
}
