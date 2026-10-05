# Design — View visibility configuration

Frozen decisions for the build card. Each decision is written so the tester can falsify it; where a decision has a cheap alternative it is named and rejected.

## D1 — The entry point lives in the More menu, and `settings` is a shell value, not a destination

The Settings page is reachable **only** from the More ▾ menu (`src/components/TopStrip.jsx`), as an item labelled **Settings** with `FaCog` (already imported by `MonthlyReview.jsx`; `react-icons/fa` is an existing dependency), placed **above Backup** — so the More menu reads: Finance, Projects, ⟂ separator, Settings, Backup, Notifications.

Rejected: a seventh top-strip tab. A configuration tab that can hide itself is unreachable, and a tab that cannot hide itself breaks the "only the chosen views appear" contract. The More menu is the one navigation element no control can remove (D6), so the entry point lives there.

`settings` therefore joins `activeView`'s value set as a **shell value** with no navigation destination of its own. It is deliberately **not** one of the six configurable views: it has no toggle, it is never written to `ui.visibleViews`, and `VIEW_ORDER` stays exactly six ids long. The `ui-presentation-system` delta renames the old scenario ("The shell changes no navigation contract") to state the actual contract: `activeView` is set to one of the six destination ids **or** to `settings`, and no router and no new app-level view state is introduced.

## D2 — One module owns the view catalogue

New file `src/components/viewVisibility.js` (plain `.js`, helpers only — a component file may not export helpers, `react-refresh/only-export-components`, the rule `keyboard.js` already lives by).

It exports:

```js
export const SETTINGS_KEY = 'ui.visibleViews';
export const VIEW_ORDER = ['today', 'planner', 'habits', 'review', 'finance', 'projects'];
export const VIEW_META = {
  today:    { label: 'Today',    goto: 't', command: 'Go to Today',    placement: 'strip', ariaLabel: 'Navigate to Today view' },
  planner:  { label: 'Week',     goto: 'w', command: 'Go to Week',     placement: 'strip', ariaLabel: 'Navigate to Week view' },
  habits:   { label: 'Habits',   goto: 'h', command: 'Go to Habits',   placement: 'strip', ariaLabel: 'Navigate to Habits view' },
  review:   { label: 'Review',   goto: 'r', command: 'Go to Review',   placement: 'strip', ariaLabel: 'Navigate to Weekly Review view' },
  finance:  { label: 'Finance',  goto: 'f', command: 'Go to Finance',  placement: 'more'  },
  projects: { label: 'Projects', goto: 'p', command: 'Go to Projects', placement: 'more'  },
};
export const ALL_VIEWS = [...VIEW_ORDER];
export function normalizeVisibleViews(value) { /* D4 */ }
export function isViewVisible(visibleViews, view) { /* membership, ALL_VIEWS-safe when null */ }
export function firstVisibleView(visibleViews) { /* canonical order, D5 */ }
export function visibleGotoKeys(visibleViews) { /* ['t','w', …] in canonical order */ }
```

Rationale: the labels and the `g` keys are today duplicated in three files (`TopStrip.jsx` `DESTINATIONS`, `CommandPalette.jsx` `VIEW_COMMANDS`, `keyboard.js` `GOTO_VIEWS`), and this change would have added a fourth (the settings rows). One catalogue means a hidden view cannot be reachable through one surface and absent from another. `keyboard.js` re-exports `GOTO_VIEWS` derived from `VIEW_META` so its public surface is unchanged.

`VIEW_META` must reproduce the **existing** strings byte-for-byte for `today`/`planner`/`habits`/`review` (`arity` matters: `App.test.jsx` asserts `aria-current` on `Navigate to Today view`, `keyboardLayer.test.jsx` asserts palette options and the footer's `SHORTCUTS`). The two `more` views keep their current labels/icons in `TopStrip` (Finance `FaWallet`, Projects `FaFolder`) — icons stay in the component, not in the catalogue.

## D3 — Persistence is server-side, under one key

`settings['ui.visibleViews']` — a JSON array of view ids written as `settingsService.set('ui.visibleViews', ['today','planner'])` (`PUT /api/settings/ui.visibleViews`, body `{ value: [...] }`) and read as `settingsService.get('ui.visibleViews')`. `src/api.js` already exposes both and needs no change.

Rejected: `localStorage`. (a) The app's JSON backup (`App.jsx` `handleBackup`, version 4) exports server data only — a localStorage preference is invisible to it, so a restore would silently change the navigation. (b) The existing app-level preferences that survive a reinstall/move already live server-side (`todayOrder`, `statementFiling.lastRun`). (c) The repo's one client-only preference (`dayframe.captureDefaults`) is a *default for a control*, not a view contract. The cost is one HTTP round trip at boot, which D5 absorbs.

## D4 — Normalization (the exact rule)

`normalizeVisibleViews(value)` → an array of view ids, in **canonical order**, or `ALL_VIEWS` when the input is unusable:

| input | result |
|---|---|
| `null` / `undefined` (unset) | `ALL_VIEWS` (six) |
| a non-array (string, object, number) | `ALL_VIEWS` |
| `[]` | `ALL_VIEWS` |
| `['today','habits']` | `['today','habits']` |
| `['habits','today']` (out of order) | `['today','habits']` — **membership, not order**; the navigation order is canonical (D9) |
| `['today','today']` | `['today']` (deduped) |
| `['today','bogus']` | `['today']` — unknown ids dropped |
| `['bogus']` / `[42]` | `ALL_VIEWS` (nothing known survived) |

The stored value is always written already normalized (canonical order, deduped, non-empty), so a hand-edited or legacy value can only ever *read* oddly, never *render* oddly.

## D5 — The shell does not paint until the preference is known

`App.jsx` gains `const [visibleViews, setVisibleViews] = useState(null)` and a mount effect that reads the one key:

```js
useEffect(() => {
  let cancelled = false;
  settingsService.get(SETTINGS_KEY)
    .then((value) => { if (!cancelled) setVisibleViews(normalizeVisibleViews(value)); })
    .catch(() => { if (!cancelled) setVisibleViews(ALL_VIEWS); });   // a failed read behaves like a fresh install
  return () => { cancelled = true; };
}, []);
```

and, before the `return (...)`, `if (visibleViews === null) return null;`.

Why a gate rather than a state that starts as "all six": the acceptance requirement is *no flash of a tab that is about to disappear*. `null` renders nothing for the one local round trip (`GET /api/settings/:key` against SQLite, typically a few ms); starting at `ALL_VIEWS` would paint a hidden destination and then remove it, and would also paint the wrong landing view when Today is hidden and then jump. The `null` state is not observable in any settled render — the tester asserts on the settled DOM, and a mocked `settingsService.get` that resolves `null` reaches `ALL_VIEWS` exactly as a fresh install does.

Existing tests are compatible by construction: every `render(<App/>)` in `App.test.jsx` and `keyboardLayer.test.jsx` waits for its first assertion (`await waitFor`, `await screen.findBy…`, or `renderApp()`'s `.tv-task` wait). The build card must not add a synchronous first assertion after `render(<App/>)`; it must await.

## D6 — The never-hideable set

There is **no control** for the More ▾ menu itself, the Settings entry, Backup or Notifications: the settings page renders exactly six rows, one per `VIEW_ORDER` id, and the More menu template always renders Settings, Backup and Notifications (plus whichever of Finance/Projects is visible). The guard is structural, not a disabled switch, so it cannot be defeated by writing `ui.visibleViews` by hand either: normalization (D4) only ever returns ids from `VIEW_ORDER`.

Tester-visible consequence: with `ui.visibleViews = ["today"]`, the More menu still contains Settings, Backup and Notifications, and the app is still navigable to the settings page (the one state from which the others can be turned back on).

## D7 — At least one view stays visible

On a toggle that would empty the set: **do not** write, **do not** flip the switch, and render an inline explanation next to that row (a `role="status"`/plain text line, wording frozen): `At least one view must stay in the navigation. Turn another view on first.`

The message is per-row (it appears under the row whose switch was refused) and clears on the next successful toggle. A silent no-op is explicitly not acceptable.

## D8 — Toggle behaviour and write path

Each row renders a `<button type="button" role="switch" aria-checked={visible}>` with the accessible name `Show <Label> in the navigation`, plus a status line whose text is exactly `Shown in the navigation` or `Hidden from the navigation` (the visible-effect wording the request asks for). No new dependency; a native switch component would be one.

On a permitted toggle: compute `next` (canonical, D4), `setVisibleViews(next)` optimistically, then `settingsService.set(SETTINGS_KEY, next)`. If the write rejects: revert to the previous value and show one inline error line `Could not save — the navigation was not changed.` Nothing else writes the key.

## D9 — Landing and fallback: one invariant

`App.jsx` gains:

```js
useEffect(() => {
  if (visibleViews && !isViewVisible(visibleViews, activeView)) setActiveView(firstVisibleView(visibleViews));
}, [visibleViews, activeView]);
```

This is the whole rule: **the active view is always a visible view.** Its observable trigger is the cold open with Today hidden (`activeView` starts `'today'`; the effect lands on the first visible view). There is deliberately **no UI path that hides the view you are standing on** — the toggles live on `settings`, which cannot be hidden — so the tester must not hunt for one: the fallback is exercised by storing a preference that excludes `today` and loading the app. That is also why the More-menu entry point matters (D1); the requirement stays testable and the invariant stays defensive.

`firstVisibleView` returns `VIEW_ORDER.find(v => visible)`, and `normalizeVisibleViews` guarantees a non-empty set, so the effect can never set `undefined`.

## D10 — Settings page (Calm Canvas, not an admin screen)

`src/components/SettingsView.jsx` + `.css`, mounted in `App.jsx`'s `main` on `activeView === 'settings'` like every other view. Structure:

- a page heading `Settings` and one muted line: `Choose which views appear in the navigation.`
- a single section (`Navigation`) rendering the six rows: view label (from `VIEW_META`), the status line, the switch.
- one muted caption at the end: `Visibility only — the order of the views is fixed.` (records the reordering out-of-scope decision on the surface itself).

Styling follows the existing surfaces: `--surface`/`--hairline` rows, `--text-body` labels, `--text-muted` status, the focus ring from `--focus-ring*`, `--space-*` rhythm, no literal 6-digit hex, no literal `font-size`, no literal `border-radius`. One column throughout; the page must be usable at 1440 / 1024 / 768 / 420 px in both themes (the switch row wraps its status under the label below ~520 px rather than overflowing).

The shell capture line is **not** rendered on `settings` (`App.jsx`'s guard becomes `activeView !== 'today' && activeView !== 'settings'`): a configuration page is not a capture surface. The capture line's own contract (row variant, `/` key, D9 defaults) is untouched.

## D11 — Keyboard and palette

- `keyboard.js`: `GOTO_VIEWS` derives from `VIEW_META` (same six entries, same keys — public shape unchanged, `keyboardLayer.test.jsx`'s imports keep working). Add `buildShortcuts(visibleViews)`: the same eight rows, with the goto row's keys rebuilt from the visible views (`g → t / w` when only Today and Week are visible) and its label listing only their names. `SHORTCUTS` stays exported as `buildShortcuts(ALL_VIEWS)` so with everything visible the footer is byte-identical to today's and the existing "documents the whole key map in its footer" test passes unmodified.
- `useKeyboardLayer.js`: `useKeyboardLayer({ onNavigate, onTogglePalette, visibleViews })`; the chord resolves `GOTO_VIEWS[key]` and navigates **only when `isViewVisible(visibleViews, view)`** — otherwise it clears the chord and does nothing (no `preventDefault`, so nothing is swallowed). `j`/`k` and `Ctrl/⌘+K` are unaffected; the palette stays droppable.
- `CommandPalette.jsx`: takes `visibleViews`, builds its command list from `VIEW_ORDER.filter(visible)` (each with `VIEW_META[id].command` and `hint: 'g ' + VIEW_META[id].goto`) plus the unchanged capture-line row, and renders the footer from `buildShortcuts(visibleViews)`. When nothing is hidden its option list is the current seven rows in the current order — `keyboardLayer.test.jsx`'s `options` length 7 and "Go to habits" assertions stay true.

Backwards-compatibility note: `visibleViews` defaults to `ALL_VIEWS` if a caller omits it, so the two components are usable without the prop.

## D12 — Tests (the acceptance map)

New, and the only test files this change adds:

- `src/__tests__/viewVisibility.test.js` — pure: the D4 table row by row, `firstVisibleView`, `visibleGotoKeys`, `buildShortcuts(ALL_VIEWS)` equals `SHORTCUTS`.
- `src/__tests__/SettingsView.test.jsx` — the six rows; status wording; a permitted toggle calls `settingsService.set('ui.visibleViews', [...])` with the canonical array; the last-visible toggle writes nothing and shows the D7 line; a rejecting write reverts and shows the D8 error.
- `src/__tests__/viewVisibilityUi.test.jsx` — App-level, `settingsService.get` mocked per case: nav renders only the visible tabs; hidden finance/projects leave the More menu; Settings/Backup/Notifications always present; unset and malformed both render all six; a preference excluding `today` lands on the first visible view and shows no hidden destination; `g f` with Finance hidden changes no view while `g t` still works; the palette lists no hidden view and its footer omits their shortcuts; the More menu still reaches Settings when only one view is visible.

Existing test files are edited **only** where the shell's own assertions must move (none are expected: all six visible is the default in every existing mock). If an edit becomes necessary it must be additive and named in the build card's handoff.

## D13 — Rule B (`.dev_context`) sweeps

- `ROUTE_MAP.md` §1: the shell paragraph and the `activeView` sentence gain the visibility rule, the `settings` view and the More menu's Settings entry; the view table gains a `settings` row. §2: the `/api/settings` row names `ui.visibleViews` beside `todayOrder`.
- `ARCHITECTURE.md`: §1 (the `App`/`TopStrip` Mermaid labels), the state-flow section that lists app-level state (the `visibleViews` read + the fallback invariant), §2's "no seventh `activeView` value" sentence (superseded: there is now a `settings` shell value, and no seventh *destination*), and §4.6's `g` chord row (visibility guard).
- `DECISION_LOG.md`: **ADR-018** (next free number — ADR-017 is the latest; re-verify with the label census, `grep -oE '\*\*ADR-[0-9]{3}' … | sort | uniq -c`, before writing) covering the entry-point placement, server-side storage vs `localStorage`, the boot gate, the guardrails, and the reordering out-of-scope note; **ADR-019** for the D15 harness repair (Node ≥ 22 shadows jsdom's `localStorage`; the two fixtures are clock-frozen; no production code changed); and one tail `## Changelog` bullet per ADR. Header line untouched (POL-007).

## D14 — Out of scope (recorded, not built)

- **Reordering** the navigation (drag, up/down, custom order). The page states the order is fixed; a follow-up change would extend `ui.visibleViews` to an ordered array (the stored array is already canonical, so the migration is "start honouring the stored order").
- A "Show all" / "Reset" action, and any per-view configuration beyond visibility.
- Hiding the six views from anything other than the navigation (routes, deep links) — there is no router.
- Persisting the active view, and any change to where the capture line lives.

## D15 — Prerequisite repair: make the suite runnable again (test-only, first commit)

Frozen because the feature's acceptance evidence cannot exist without it (proposal's prerequisite section). **No production file changes**; only `src/setupTests.js` and two test fixtures.

1. `src/setupTests.js` — after the existing `Notification` mock, restore the global jsdom no longer installs:

   ```js
   if (typeof globalThis.localStorage === 'undefined') {
     const memory = new Map();
     Object.defineProperty(globalThis, 'localStorage', {
       configurable: true, enumerable: false,
       value: {
         getItem: (key) => (memory.has(String(key)) ? memory.get(String(key)) : null),
         setItem: (key, value) => { memory.set(String(key), String(value)); },
         removeItem: (key) => { memory.delete(String(key)); },
         clear: () => { memory.clear(); },
         key: (index) => Array.from(memory.keys())[index] ?? null,
         get length() { return memory.size; },
       },
     });
   }
   ```

   jsdom-shaped surface (`getItem`/`setItem`/`removeItem`/`clear`/`key`/`length`, `String()` coercion on key and value), a module-scope `Map` for per-file isolation (a setup file runs once per test file), and the `typeof === 'undefined'` guard so it is inert wherever jsdom's own value exists. Measured 2026-10-05: **8 files / 114 failing tests → 2 files / 3**.

2. `src/__tests__/habits.test.js` — `handles weekly streaks by timesPerWeek` must not depend on the weekday the suite runs on. Preferred fix: freeze the clock for that test only (`vi.useFakeTimers({ shouldAdvanceTime: true })` + `vi.setSystemTime(new Date('<a fixed Wednesday>'))`, restored with `vi.useRealTimers()` in a `finally`). Equivalent alternative: build the fixture from `startOfWeek(now, { weekStartsOn: 1 })` so the current week already holds `timesPerWeek` entries.
3. `src/__tests__/WeeklyReview.test.jsx` — the two key-event tests (`lists key events for the current week grouped by day`, `calls onAddKeyEvent when a key event is added from the review`) must seed the event in the week the review actually opens on: `startOfWeek(subDays(new Date(), 1), { weekStartsOn: 1 })` — the expression the component and the file's own `defaultWeekStart` already use — not `thisWeekStart()`.

**Do not** change `calculateWeeklyStreak` or the review's default-week rule. Both failures are fixture defects; the weekly-streak display behaviour they expose (a 2×/week habit reads 0 early in the week until the week's target is met) is an **owner-facing observation**, recorded in the close-out, not fixed here (that is a behaviour decision for Anderson). ADR-019 records the repair; one tail `## Changelog` bullet carries it (D13).

