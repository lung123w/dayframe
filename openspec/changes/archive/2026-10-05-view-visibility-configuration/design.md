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

**Parity audit (spec pass, 2026-10-05, branch head `a5d0d6a`).** Every string above was re-read byte-for-byte against the code and all six rows match — no correction was needed. Evidence: `TopStrip.jsx:19-24` (`DESTINATIONS` — `label` + `ariaLabel`), `TopStrip.jsx:27-34` (`VIEW_TITLES`, whose value for each id equals `label`), `TopStrip.jsx:82` / `:86` (the More items' text `Finance` / `Projects`, matching `label`), `CommandPalette.jsx:23-30` (`VIEW_COMMANDS` — `command`, and `hint: 'g ' + goto`), `keyboard.js:45-52` (`GOTO_VIEWS` — `goto` ↔ id) and `keyboard.js:58-67` (`SHORTCUTS`). Two clarifications the build must not improvise:

- `finance` / `projects` carry **no `ariaLabel`**: their More-menu item's accessible name is its text label, so those rows have four fields and the four strip views have five. Never add an `ariaLabel` to the `more` rows (it would change the item's accessible name for no reason).
- `VIEW_TITLES` is the shell's own title map, **not** the catalogue: it gains `settings: 'Settings'` (D1/D10) so the strip can title the Settings page, and `VIEW_ORDER` stays exactly six ids long.

## D3 — Persistence is server-side, under one key

`settings['ui.visibleViews']` — a JSON array of view ids written as `settingsService.set('ui.visibleViews', ['today','planner'])` (`PUT /api/settings/ui.visibleViews`, body `{ value: [...] }`) and read as `settingsService.get('ui.visibleViews')`. `src/api.js` already exposes both and needs no change.

Rejected: `localStorage`. (a) The app's JSON backup (`App.jsx` `handleBackup`, version 4) exports server data only — a localStorage preference is invisible to it, so a restore would silently change the navigation. (b) The existing app-level preferences that survive a reinstall/move already live server-side (`todayOrder`, `statementFiling.lastRun`). (c) The repo's one client-only preference (`dayframe.captureDefaults`) is a *default for a control*, not a view contract. The cost is one HTTP round trip at boot, which D5 absorbs.

## D4 — Normalization (the exact rule)

`normalizeVisibleViews(value)` → an array of view ids, in **canonical order**, or `ALL_VIEWS` when the input is unusable:

| input | result |
|---|---|
| `null` / `undefined` (unset) | `ALL_VIEWS` (six) |
| a non-array — a string, a number, an object. **`'today'` (a bare string) is an unusable value, not one id** | `ALL_VIEWS` |
| `[]` | `ALL_VIEWS` |
| `['today','habits']` | `['today','habits']` |
| `['habits','today']` (out of order) | `['today','habits']` — **membership, not order**; the navigation order is canonical (D9) |
| `['today','today']` | `['today']` (deduped) |
| `['today','bogus']` | `['today']` — unknown ids dropped |
| `['bogus']` / `[42]` / `[{ view: 'today' }]` / `[['today']]` (nothing known survived) | `ALL_VIEWS` |
| `['Today']` / `['today ']` (near-miss id) | `ALL_VIEWS` — matching is **exact**: case- and whitespace-sensitive. Do not add `.toLowerCase()` or `.trim()` |
| an array of 5000 entries (`new Array(5000).fill('today')`, or 5000 mixed ids) | `['today']` / `ALL_VIEWS` — at most the six known ids, canonical order, deduped. The output is never longer than `VIEW_ORDER.length` |

Entries that are not strings are dropped; a value that is not an array is unusable whatever its type. The function never throws. The stored value is always written already normalized (canonical order, deduped, non-empty), so a hand-edited or legacy value can only ever *read* oddly, never *render* oddly.

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

**Audit of that claim (spec pass, 2026-10-05) — it holds.** Every `render(<App/>)` in the two files is followed by an awaited settle: `App.test.jsx:104/113/123/135/145/157/167` all reach `await waitFor(…)` or `await screen.findBy…` before the first `expect`, and `keyboardLayer.test.jsx` goes through `renderApp()` (line 126-131, which awaits `.tv-task × 2`) or awaits in place (line 241, 258). **No file, no line needs an additive edit.** The one thing to keep true: `settingsService.get` is mocked to resolve in both files (`App.test.jsx:62-65`, `keyboardLayer.test.jsx:89-92`), and `vi.clearAllMocks()` keeps mock implementations, so the boot read settles on the microtask queue and `waitFor` catches it.

**What "no flash" means, precisely (the testable assertion).** "No flash" is a statement about the sequence of paints, and the check that cannot pass on a flashing implementation is:

1. **Synchronously after `render(<App/>)`** — while the boot read is still pending — `container.firstChild` is `null`: no `.top-strip`, no `[role="dialog"]`, nothing at all. (A test that mocks `settingsService.get` with a manually-resolved promise can hold this state open and assert it directly.)
2. **After the read settles** — the *first* DOM that exists carries only the visible destinations. Assert the absence directly (`expect(screen.queryByRole('button', { name: /navigate to finance view/i })).toBeNull()`, `expect(screen.queryByRole('menuitem', { name: /finance/i })).toBeNull()`), never with `waitFor(() => expect(hidden).not.toBeInTheDocument())` — that assertion passes on an implementation that painted the hidden tab first and removed it, which is the bug this gate exists to prevent.
3. The settled strip title is the visible landing view (`data-testid="top-strip-title"`), not an intermediate value: with `today` hidden the title reads the first visible view's label on the first paint that exists, with no intervening `Today · …`.

The `null` state itself is never a settled state: a mocked `settingsService.get` that resolves `null` (or rejects — D5's `catch`) reaches `ALL_VIEWS` exactly as a fresh install does, so no existing "cold open shows Today" test loses its target.

## D6 — The never-hideable set

There is **no control** for the More ▾ menu itself, the Settings entry, Backup or Notifications: the settings page renders exactly six rows, one per `VIEW_ORDER` id, and the More menu template always renders Settings, Backup and Notifications (plus whichever of Finance/Projects is visible). The guard is structural, not a disabled switch, so it cannot be defeated by writing `ui.visibleViews` by hand either: normalization (D4) only ever returns ids from `VIEW_ORDER`.

Tester-visible consequence: with `ui.visibleViews = ["today"]`, the More menu still contains Settings, Backup and Notifications, and the app is still navigable to the settings page (the one state from which the others can be turned back on).

**Why it is structural, not a switch (code anchors).** Today's `TopStrip.jsx` renders the `DropdownMenu.Root`/`Trigger` (lines 71-77) and its `Content` (line 79) **unconditionally**; only the two destination *items* would be filtered by the build, and Settings/Backup/Notifications stay as unconditional siblings of them. So the More trigger, the Settings item, Backup and Notifications have no conditional expression to falsify — there is nothing to write `false` into. On the other side, the settings page's row list is generated from `VIEW_ORDER` (six ids, never `settings`), so the never-hideable set is never in the loop that renders toggles. Consequence for the build: the filter must be applied to the *items* (the `onNavigate('finance')` / `onNavigate('projects')` pair), never to `DropdownMenu.Root` or `DropdownMenu.Trigger`; and the settings page must map `VIEW_ORDER`, never a union with `settings`.

## D7 — At least one view stays visible

On a toggle that would empty the set: **do not** write, **do not** flip the switch, and render an inline explanation next to that row (a `role="status"`/plain text line, wording frozen): `At least one view must stay in the navigation. Turn another view on first.`

The message is per-row (it appears under the row whose switch was refused) and clears on the next successful toggle. A silent no-op is explicitly not acceptable.

**Totality of the guard.** The refusal is computed per toggle as "would this leave the set empty", so the **only** state that can refuse is a visible set of exactly one (`size === 1`). With `size ≥ 2` every toggle is permitted, and the set can never be empty, so there is no other branch to specify — and no "all views hidden" state exists for the palette or the navigation to handle. The refused outcome has three parts and all three are pinned: the switch stays on (assert `aria-checked="true"`), `settingsService.set` is **not** called (assert `not.toHaveBeenCalled()` — the stored value is untouched), and the exact D7 line is on screen.

## D8 — Toggle behaviour and write path

Each row renders a `<button type="button" role="switch" aria-checked={visible}>` with the accessible name `Show <Label> in the navigation`, plus a status line whose text is exactly `Shown in the navigation` or `Hidden from the navigation` (the visible-effect wording the request asks for). No new dependency; a native switch component would be one.

On a permitted toggle: compute `next` (canonical, D4), `setVisibleViews(next)` optimistically, then `settingsService.set(SETTINGS_KEY, next)`. If the write rejects: revert to the previous value and show one inline error line `Could not save — the navigation was not changed.` Nothing else writes the key.

## D9 — Landing and fallback: one invariant

`App.jsx` gains:

```js
useEffect(() => {
  if (visibleViews && VIEW_ORDER.includes(activeView) && !isViewVisible(visibleViews, activeView)) {
    setActiveView(firstVisibleView(visibleViews));
  }
}, [visibleViews, activeView]);
```

The `VIEW_ORDER.includes(activeView)` guard is **load-bearing, and was missing from the first cut of this design** — corrected in the spec pass (2026-10-05). Without it, opening the Settings page is instantly undone: `activeView` becomes the `settings` shell value, `isViewVisible(visibleViews, 'settings')` is `false` because `settings` is not one of the six configurable ids, and the effect would immediately call `setActiveView(firstVisibleView(visibleViews))` and bounce the user off the page — the toggles would be unreachable and D1/D10 would be dead on arrival. Only the six view ids are subject to the fallback; the `settings` shell value never is. `isViewVisible` itself stays plain membership (D2); the exemption belongs to the call site that knows the difference between a view and a shell value.

This is the whole rule: **the active view (when it is one of the six) is always a visible view.** Its observable trigger is the cold open with Today hidden (`activeView` starts `'today'`; the effect lands on the first visible view). There is deliberately **no UI path that hides the view you are standing on** — the toggles live on `settings`, which cannot be hidden — so the tester must not hunt for one: the fallback is exercised by storing a preference that excludes `today` and loading the app. That is also why the More-menu entry point matters (D1); the requirement stays testable and the invariant stays defensive.

`firstVisibleView` returns `VIEW_ORDER.find(v => visible)`, and `normalizeVisibleViews` guarantees a non-empty set, so the effect can never set `undefined`.

## D10 — Settings page (Calm Canvas, not an admin screen)

`src/components/SettingsView.jsx` + `.css`, mounted in `App.jsx`'s `main` on `activeView === 'settings'` like every other view. Structure:

- a page heading `Settings` and one muted line: `Choose which views appear in the navigation.`
- a single section (`Navigation`) rendering the six rows: view label (from `VIEW_META`), the status line, the switch.
- one muted caption at the end: `Visibility only — the order of the views is fixed.` (records the reordering out-of-scope decision on the surface itself).

Styling follows the existing surfaces: `--surface`/`--hairline` rows, `--text-body` labels, `--text-muted` status, the focus ring from `--focus-ring*`, `--space-*` rhythm, no literal 6-digit hex, no literal `font-size`, no literal `border-radius`. One column throughout; the page must be usable at 1440 / 1024 / 768 / 420 px in both themes (the switch row wraps its status under the label below ~520 px rather than overflowing).

The shell capture line is **not** rendered on `settings` (`App.jsx`'s guard becomes `activeView !== 'today' && activeView !== 'settings'`): a configuration page is not a capture surface. The capture line's own contract (row variant, `/` key, D9 defaults) is untouched.

**Exact surface strings (frozen; the tester asserts these).** Page heading `Settings`; the one muted line `Choose which views appear in the navigation.`; the section label `Navigation`; the tail caption `Visibility only — the order of the views is fixed.` The strip title for the page is `Settings · <the same long date every view shows>` — `TopStrip.jsx`'s `VIEW_TITLES` (line 27-34) gains `settings: 'Settings'`, and because `settings` is not one of the six destinations no destination is marked active (the current `aria-current={currentView === view ? 'page' : undefined}` logic needs no change). The three strings that are *behaviour*, not copy, are pinned in the delta as well: the D7 refusal line, the two D8 status lines, and the D8 write-failure line.

## D11 — Keyboard and palette

- `keyboard.js`: `GOTO_VIEWS` derives from `VIEW_META` (same six entries, same keys — public shape unchanged, `keyboardLayer.test.jsx`'s imports keep working). Add `buildShortcuts(visibleViews)`: the same eight rows, with the goto row's keys rebuilt from the visible views (`g → t / w` when only Today and Week are visible) and its label listing only their names. `SHORTCUTS` stays exported as `buildShortcuts(ALL_VIEWS)` so with everything visible the footer is byte-identical to today's and the existing "documents the whole key map in its footer" test passes unmodified.
- `useKeyboardLayer.js`: `useKeyboardLayer({ onNavigate, onTogglePalette, visibleViews })`; the chord resolves `GOTO_VIEWS[key]` and navigates **only when `isViewVisible(visibleViews, view)`** — otherwise it clears the chord and does nothing (no `preventDefault`, so nothing is swallowed). `j`/`k` and `Ctrl/⌘+K` are unaffected; the palette stays droppable.
- `CommandPalette.jsx`: takes `visibleViews`, builds its command list from `VIEW_ORDER.filter(visible)` (each with `VIEW_META[id].command` and `hint: 'g ' + VIEW_META[id].goto`) plus the unchanged capture-line row, and renders the footer from `buildShortcuts(visibleViews)`. When nothing is hidden its option list is the current seven rows in the current order — `keyboardLayer.test.jsx`'s `options` length 7 and "Go to habits" assertions stay true.

**Byte-identity, spelled out (D11's acceptance).** Rows 1-5, 7 and 8 of `SHORTCUTS` are unchanged literals; row 6 is the derived one and must be built exactly as:

```js
{ keys: `g → ${views.map((v) => VIEW_META[v].goto).join(' / ')}`,
  label: views.map((v) => VIEW_META[v].label).join(' · ') }
```

with `U+2192` (→) after `g `, ` / ` between letters, and `U+00B7` (·) with one space either side between labels — the two characters already in `keyboard.js:64`. With all six visible that yields `g → t / w / h / r / f / p` and `Today · Week · Habits · Review · Finance · Projects`, byte-identical to today's row, so `buildShortcuts(ALL_VIEWS)` is element-for-element equal to the shipped `SHORTCUTS` and `keyboardLayer.test.jsx`'s footer loop (line 379-382) passes unmodified. The `key={shortcut.keys}` React key stays valid because no two rows share a key string.

**"Changes nothing and consumes nothing".** When the chord is armed and the second keystroke is a hidden view's letter, the handler has two side-effect-free obligations: (1) it must not navigate and must not mark anything active; (2) it must **not** call `preventDefault()` (the tester can prove this: dispatch a `cancelable` `keydown` and assert `defaultPrevented === false`, the same technique `keyboardLayer.test.jsx:350-353` uses for Tab). The chord is still disarmed — `g` is a one-shot — but nothing else moves, and the row handlers have already stood down (`isGotoArmed()`), so the letter does not also defer or toggle a row.

**The never-empty palette.** The palette's option list is `VIEW_ORDER.filter(visible).length + 1` (the capture-line row), so it is always between 2 and 7 rows: there is no "all views hidden" case to design, and D7 is what guarantees it. With nothing hidden the list is the current seven rows in the current order, which is `keyboardLayer.test.jsx:358-370` unchanged.

Backwards-compatibility note: `visibleViews` **defaults to `ALL_VIEWS` when the prop is absent or `null`** — the components must stay usable without it, and note that a destructuring default (`{ visibleViews = ALL_VIEWS }`) does **not** fire on an explicit `null`, which is exactly the value `App.jsx` holds during the boot round trip (D5). The null-safety therefore has to live in the guard (`isViewVisible` is `ALL_VIEWS`-safe when the set is null, D2) or in an explicit `visibleViews ?? ALL_VIEWS` at the call sites — not only in a default parameter. Nothing renders during that window anyway (D5's gate), so no keystroke can act on a surface the user can see.

## D12 — Tests (the acceptance map)

New, and the only test files this change adds:

- `src/__tests__/viewVisibility.test.js` — pure: the D4 table row by row **including the spec-pass rows** (`null`/`undefined`, a bare `'today'` string, a number, an object, `[]`, a duplicated id, an out-of-order pair, `['today','bogus']`, `['bogus']`, `[42]`, `[{ view: 'today' }]`, `[['today']]`, `['Today']`/`['today ']`, and a 5000-entry array), `firstVisibleView`, `visibleGotoKeys`, and `buildShortcuts(ALL_VIEWS)` **deep-equals** `SHORTCUTS` (not merely its goto row).
- `src/__tests__/SettingsView.test.jsx` — the six rows and no seventh control; the `role="switch"` + `aria-checked` + `Show <Label> in the navigation` accessible name; both exact status strings; a permitted toggle calls `settingsService.set('ui.visibleViews', [...])` with the canonical array; the `size === 1` toggle writes nothing (`set` not called) and shows the exact D7 line, which then clears after the next permitted toggle; a rejecting write reverts the switch and shows the exact D8 error line.
- `src/__tests__/viewVisibilityUi.test.jsx` — App-level, `settingsService.get` mocked per case: the sync-after-render DOM is empty while the read is pending (D5's gate) and the settled DOM never contains a hidden destination (assert absence, never `waitFor(not.toBeInTheDocument)`); nav renders only the visible tabs; hidden finance/projects leave the More menu; Settings/Backup/Notifications always present; unset and malformed both render all six; a preference excluding `today` lands on the first visible view and shows no hidden destination; **opening Settings keeps Settings rendered** (the D9 `VIEW_ORDER.includes` guard) and the strip title reads `Settings · …`; `g f` with Finance hidden changes no view, consumes nothing (`defaultPrevented === false`) while `g t` still works; the palette lists no hidden view and its footer omits their shortcuts; the More menu still reaches Settings when only one view is visible.

Existing test files are edited **only** where the shell's own assertions must move (none are expected: all six visible is the default in every existing mock). If an edit becomes necessary it must be additive and named in the build card's handoff.

## D13 — Rule B (`.dev_context`) sweeps

Section and line anchors verified against the repo on 2026-10-05 (`a5d0d6a`) — **D13's first cut named three of them wrongly** (§1 for the Mermaid, §2 for the "no seventh `activeView`" sentence); the corrected anchors are below so the build card does not hunt.

- `ROUTE_MAP.md`
  - §1 opening paragraph (line 7): "mounts it in `.app-chrome` on the five non-Today views" → **four** (Today owns the row; `settings` is not a capture surface), and the `activeView` sentence gains "while Today is visible; otherwise the first visible view is the canonical-order fallback"; the stale citation in the same sentence is `src/App.jsx:46`, not `:41`.
  - §1 stage-2 shell paragraph (line 9): the strip carries the **visible** main destinations, and the More overflow holds the visible overflow destinations **plus Settings** (a new, never-hideable entry above Backup) · Backup · Notifications.
  - §1 view table (lines 17-24): a new `settings` row after `finance` — component `SettingsView.jsx` + `.css`; the six `VIEW_ORDER` rows with a `role="switch"` each; reached only from the More menu; never written to `ui.visibleViews`, never a seventh destination.
  - §2 (line 70): the `/api/settings` row names `ui.visibleViews` beside `todayOrder` and `statementFiling.lastRun`.
  - Citation drift to fix **while you are in those paragraphs anyway** (measured, not guessed): the shell paragraph's `activeView` citation (line 7) is `App.jsx:46`; the planner toolbar is `App.jsx:388-417` (doc says `:346-375`, line 20); the modal mounts are `:471-499` (doc says `:429-457`, line 30).
- `ARCHITECTURE.md`
  - **The Mermaid graph is in §2 (lines 28-72), not §1** (the lead's first cut said §1): line 32's `TopStrip` label gains `Settings` in the More list; line 33's `CaptureLine` label "the capture line on the five non-Today views" → "the four non-Today, non-Settings views"; a new `App --> Settings["SettingsView.jsx — the six view toggles (settings shell value)"]` edge.
  - §3 state ownership: the state Mermaid (lines 114-135) gains the `visibleViews` read, and the two §3 bullets both need edits — the `activeView` bullet (line 138) gains the visibility rule and the `settings` shell value, and **"Stage 5 adds exactly one piece of app-level state"** (line 143) is now wrong: it is two (`paletteOpen` + `visibleViews`).
  - §4.1's capture step (line 151) repeats "variant 'shell' on the five non-Today views" → four.
  - §4.6: the `g` chord row (line 262) gains "only for a visible view; a hidden view's letter is a no-op that consumes nothing"; the "What the layer does not do" sentence (line 268) — **this is where "no seventh `activeView` value" lives, not §2** — becomes "no seventh *destination*: `settings` is a shell value, and there is still no router".
  - Citation drift in the same file (measured): `activeView` is `App.jsx:46` not `:41` (line 138); `loadData` is `:63-94` not `:47-78` (line 137); `HabitTracker`'s props are `:439-441` not `:397-399` (line 140); `todayOrder`'s write is `handleTodayOrderChange` at `:234-243` (the `set` is `:237`), not `:202-211` (line 141).
- `DECISION_LOG.md`
  - §A tail (after ADR-017, before `## B. Product / UI conventions`, line 138) gains **ADR-018** — the entry point in the More menu; server-side `settings['ui.visibleViews']` over `localStorage` (the three reasons in D3); the boot gate; the never-hideable set; the at-least-one guard; the fallback **and its `settings` exemption** (D9's corrected guard); reordering out of scope — and **ADR-019** — the D15 harness repair (Node ≥ 22 shadows jsdom's `localStorage`; the `typeof`-guarded restore in `setupTests.js`; the three weekday-independent fixtures; no production file changed; measured 8 files / 114 tests failing → 0).
  - Next free numbers **confirmed**: `grep -oE '\*\*ADR-[0-9]{3}' .dev_context/DECISION_LOG.md | sort | uniq -c` lists ADR-001…ADR-017, one each (ADR-015/016/017 are the statement-filing, capture-row and Timeline-panel entries); ADR-018 and ADR-019 are absent. Re-run the census before writing, never a heading grep.
  - One tail `## Changelog` bullet per ADR (append-only, newest last); header line untouched (POL-007); gate `grep -h '^Owner:' .dev_context/*.md | sort -u | wc -l` must print `1`.
  - While in §D (optional, cheap): its "Six base specs … are still delta-shaped" item undercounts — `openspec validate --specs --strict` reports **eight** failures for the same reason (missing `# <name> Specification` + `## Purpose`), the list also including `daily-workflow-session` and `workflow-under-habits`. Correct the count/list while you are in the file.
- Optional, not required: a one-line `ROUTE_MAP.md` §3 convention ("the navigation renders only the visible views; `ui.visibleViews` holds them canonically"). Add it only if it reads cleanly next to the keyboard-layer convention.

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

