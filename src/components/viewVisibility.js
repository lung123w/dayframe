/**
 * The one owner of the view catalogue — `view-visibility-configuration`
 * (`design.md` D2; ADR-018).
 *
 * Plain `.js`, helpers only, because a component file may not export helpers
 * (`react-refresh/only-export-components`) — the rule `keyboard.js` already
 * lives by. Before this module the labels and the `g` keys were duplicated in
 * three files (`TopStrip.jsx` `DESTINATIONS`, `CommandPalette.jsx`
 * `VIEW_COMMANDS`, `keyboard.js` `GOTO_VIEWS`) and this change would have added
 * a fourth (the Settings rows); one catalogue means a hidden view cannot be
 * reachable through one surface and absent from another.
 *
 * The `label`, `goto`, `command` and `ariaLabel` strings are byte-for-byte the
 * ones the component files carried, and the two `more` rows deliberately carry
 * no `ariaLabel` (their More-menu item's accessible name is its text label).
 * Icons stay in the components, not here.
 */

/** The settings row the visible set lives in (`GET`/`PUT /api/settings/:key`). */
export const SETTINGS_KEY = 'ui.visibleViews';

/** The canonical order. Reordering is out of scope (design.md D14). */
export const VIEW_ORDER = ['today', 'planner', 'habits', 'review', 'finance', 'projects'];

/** Per-view copy and placement. `strip` = a top-strip destination, `more` = a More-menu item. */
export const VIEW_META = {
  today: { label: 'Today', goto: 't', command: 'Go to Today', placement: 'strip', ariaLabel: 'Navigate to Today view' },
  planner: { label: 'Week', goto: 'w', command: 'Go to Week', placement: 'strip', ariaLabel: 'Navigate to Week view' },
  habits: { label: 'Habits', goto: 'h', command: 'Go to Habits', placement: 'strip', ariaLabel: 'Navigate to Habits view' },
  review: { label: 'Review', goto: 'r', command: 'Go to Review', placement: 'strip', ariaLabel: 'Navigate to Weekly Review view' },
  finance: { label: 'Finance', goto: 'f', command: 'Go to Finance', placement: 'more' },
  projects: { label: 'Projects', goto: 'p', command: 'Go to Projects', placement: 'more' },
};

/** The fresh-install set: every view, in canonical order. */
export const ALL_VIEWS = [...VIEW_ORDER];

/**
 * Turn a stored value into a usable visible set (design.md D4, frozen here so a
 * hand-edited or legacy cell can only ever *read* oddly, never *render* oddly).
 *
 * → an array of known view ids in canonical order, deduped, never empty and
 *   never longer than `VIEW_ORDER`; a value that is not an array, an empty
 *   array, or an array that yields no known id → `ALL_VIEWS`.
 *
 * Matching is exact: `'Today'` and `'today '` are unknown ids, not near-misses.
 * The function never throws.
 */
export function normalizeVisibleViews(value) {
  if (!Array.isArray(value)) return ALL_VIEWS;
  const known = new Set();
  for (const entry of value) {
    if (typeof entry === 'string' && Object.prototype.hasOwnProperty.call(VIEW_META, entry)) {
      known.add(entry);
    }
  }
  const ordered = VIEW_ORDER.filter((view) => known.has(view));
  return ordered.length ? ordered : ALL_VIEWS;
}

/**
 * Membership. `ALL_VIEWS`-safe when the set is null/not an array (the value
 * `App.jsx` holds during its boot round trip, design.md D5/D11) so a component
 * used without the prop still renders every view.
 */
export function isViewVisible(visibleViews, view) {
  if (!Array.isArray(visibleViews)) return true;
  return visibleViews.includes(view);
}

/** The first visible view in canonical order — the landing/fallback view (D5/D9). */
export function firstVisibleView(visibleViews) {
  return VIEW_ORDER.find((view) => isViewVisible(visibleViews, view)) || VIEW_ORDER[0];
}

/** The `g` letters of the visible views, in canonical order (`['t','w',…]`). */
export function visibleGotoKeys(visibleViews) {
  return VIEW_ORDER
    .filter((view) => isViewVisible(visibleViews, view))
    .map((view) => VIEW_META[view].goto);
}
