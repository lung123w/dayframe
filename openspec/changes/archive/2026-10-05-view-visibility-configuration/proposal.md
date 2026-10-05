# Proposal: View visibility configuration

## Why

Owner request (2026-09-27): *"add a configuration page in dayframe app to configure what tabs to be shown in the app"*.

DayFrame's shell is fixed: `TopStrip.jsx` renders four text destinations (Today, Week, Habits, Review) and a **More ▾** Radix dropdown holding Finance, Projects, a separator, Backup and Notifications. There are exactly six views (`src/App.jsx` switches on `activeView`), and every one of them is always in the navigation. Anderson uses a subset of them (finance is a monthly ritual, projects is a small list), and today the only way to quiet a view is to ignore it.

There is no configuration surface anywhere in the app. This change adds one, scoped to a single question: **which of the six views appear in the navigation**.

## The surface today (verified, do not re-derive)

- `src/components/TopStrip.jsx` — `DESTINATIONS` (four strip buttons) + the More menu (Finance, Projects, Backup, Notifications). Six `activeView` values are set by the shell; there is **no router** (`ui-presentation-system` spec: "One shared shell carries navigation on every view").
- `src/App.jsx:41` — `const [activeView, setActiveView] = useState('today')`; the six views render one at a time from that one string. Today is the cold open (`ui-presentation-system`, "Today is the cold open").
- `src/components/CommandPalette.jsx` — `VIEW_COMMANDS` (six "Go to …" rows + focus-the-capture-line) and a footer that renders `SHORTCUTS` from `keyboard.js`.
- `src/components/keyboard.js` — `GOTO_VIEWS = { t: 'today', w: 'planner', h: 'habits', r: 'review', f: 'finance', p: 'projects' }`; `src/components/useKeyboardLayer.js` resolves the `g` chord against it.
- `server/routes/settings.js` — a generic key/value API: `GET /api/settings/:key` (JSON-parsed, `value: null` when unset) and `PUT /api/settings/:key` with `{ "value": … }`. The existing store already holds `todayOrder` and `statementFiling.lastRun`. **No new table, no migration, no new route.**

## What Changes

1. **A Settings page** — `activeView === 'settings'`, a shell value that is **not** a seventh navigation destination. It is reachable only from the **More ▾** menu, as a new item ("Settings", gear icon) placed above Backup. Rationale (recorded as a decision): a configuration *tab* could hide itself, so the entry point must live in the menu that can never be hidden. The page lists the **six** views with a show/hide switch each, and says plainly what the effect is ("Shown in the navigation" / "Hidden").
2. **Persistence: `settings['ui.visibleViews']`** — a JSON array of view ids, read and written through the existing `/api/settings/:key` route. Unset, malformed, non-array, unknown-id-only or empty ⇒ **all six visible**, so a fresh install behaves exactly as today. The preference is read **before the shell first paints** (`ui-presentation-system`'s no-flash requirement is the reason), so no tab that is about to disappear is ever rendered.
3. **Guardrails** (acceptance-critical):
   - The **More ▾ menu itself, Settings, Backup and Notifications can never be hidden** — they are not in the configurable set and no control exists for them.
   - **At least one view stays visible**: hiding the last visible view is refused with an inline explanation (not a silent no-op), and the stored preference is left untouched.
   - If the **active view is not visible** (including the cold open, when Today is hidden), the app renders the **first visible view in the canonical order** `[today, planner, habits, review, finance, projects]`.
   - Hiding `finance` / `projects` removes them from the **More menu**; hiding the four main views removes them from the **top-strip row**.
4. **The keyboard layer respects visibility.** The `g` chord performs no navigation to a hidden view, `CommandPalette` offers no hidden view, and its footer advertises only the visible views' shortcuts. A hidden view reachable by keyboard would read as a bug.
5. **Visibility only — reordering is explicitly out of scope.** The navigation order stays canonical; the page says so, and it is recorded as a possible follow-up.
6. **OpenSpec**: this change, plus delta specs — the new capability `view-visibility` and two `MODIFIED` requirements on `ui-presentation-system` (the shell's navigation contract, and the cold open, both of which the visibility preference changes).

## Prerequisite: master's test suite is currently red (measured — not caused by this change)

Measured on `master` `0c3c3fa` at 2026-10-05 with
`npx vitest run --exclude='**/.worktrees/**' --exclude='not relevant/**'`:

- **raw: 8 files / 114 tests failed** (36 files / 481 tests; the tracked suite is 35 / 478 — the extra file is another lane's untracked `src/__tests__/wrModeStorage.test.jsx`, which must not be touched or deleted).
- Root cause (reproduced with a throwaway probe test): this box now runs **Node v26.7.0**. Node ≥ 22 defines its own `globalThis.localStorage` accessor, `undefined` unless `--localstorage-file` is passed, and `vitest`'s jsdom environment only installs jsdom's globals where the key is absent — so `localStorage` is `undefined` inside every test file. Everything that calls `localStorage.clear()` / `getItem` throws: `App.test.jsx`, `keyboardLayer.test.jsx`, `MonthlyReview.test.jsx`, `todayQuickCapture.test.jsx`, `WeeklyReview.test.jsx`, `YearlyGoals.test.jsx`, `wrModeStorage.test.jsx` (**7 files / 111 tests**).
- The other **2 files / 3 tests** fail only when "today" is a Monday (2026-10-05 is one): `habits.test.js:49` (the weekly-streak fixture builds two entries per week relative to "now", and on a Monday the current week holds only one) and `WeeklyReview.test.jsx`'s two key-event tests (they seed an event on the week containing **today**, while the review opens on the week containing **yesterday** — last week, on a Monday).
- **Proven repair** (test-only; measured — the same command then reports **2 files / 3 tests failed**, i.e. only the two Monday fixtures): restore a jsdom-shaped `localStorage` in `src/setupTests.js` when `globalThis.localStorage` is undefined, and make the three date-dependent fixtures deterministic. No production file changes.

This change's acceptance evidence (`npx vitest run` green) is unreachable without that repair, so it is the **first commit of this branch and it is in scope** — frozen in `design.md` D15 and `tasks.md` §0, verified by the same `df-tester` acceptance card, and recorded as its own ADR. Precedent for gating on a prerequisite: the `hide-today-timeline` lane parented its build card on the capture-row close-out.

## Capabilities

### New Capabilities

- `view-visibility`: the six configurable views, the `ui.visibleViews` key and its defaults, the never-hideable set, the at-least-one guard, the active-view/landing fallback, and the keyboard/palette consequence.

### Modified Capabilities

- `ui-presentation-system`:
  - **One shared shell carries navigation on every view** — the strip and the More overflow carry the *visible* subset of the six destinations; the More overflow additionally always holds **Settings** (never hideable); the shell sets the six destination ids or the `settings` shell value.
  - **Today is the cold open** — Today is the cold open *while it is visible*; otherwise the first visible view in canonical order (the visibility preference is a strictly later requirement than the cold open, so this is a supersede, not a contradiction).
  - Not modified: the token layer, rows, habit logging, debounced writes, dialogs, the keyboard layer's droppability, and the preservation requirement. The keyboard requirement's scenarios stay true (the palette is still droppable; its *contents* are constrained by `view-visibility`).

## Impact

- **New files**: `openspec/changes/view-visibility-configuration/` (this folder); `src/components/SettingsView.jsx` + `.css`; `src/components/viewVisibility.js` (the one module that owns the view catalogue, the canonical order, the setting key and the normalizer); `src/__tests__/viewVisibility.test.js` + `src/__tests__/SettingsView.test.jsx`.
- **Modified files** (implementation phase): `src/App.jsx` (boot read + `visibleViews` state + the fallback invariant + the `settings` branch + rendering the page; the shell capture line is not rendered on `settings`), `src/components/TopStrip.jsx` (filter the destinations, filter the More menu, add the Settings item), `src/components/CommandPalette.jsx` (filter the commands, footer from the visible set), `src/components/keyboard.js` (derive `GOTO_VIEWS` from the catalogue; add `buildShortcuts(visibleViews)` with `SHORTCUTS` kept as the all-visible default), `src/components/useKeyboardLayer.js` (accept `visibleViews`, guard the chord), `src/styles/tokens.css` **only if** a needed role is missing (expected: no change), `.dev_context/{ROUTE_MAP,ARCHITECTURE,DECISION_LOG}.md`.
- **No new npm package. No server change. No DB migration. No new route.**
- **Backward compatibility**: full. With no stored preference (a fresh install, or an existing one) all six views render exactly as today; the only additive shell element is the More menu's Settings item.
- **Untouched by design**: the capture line's contract (the row variant, the `/` key, the D9 defaults), the Today list, the statement-filing step, `server/`, `data/app.db`.

## Open coordination note

`master` `0c3c3fa` is clean (the only untracked paths are the pre-existing cross-lane leftovers `.opencode/design-references/` and `src/__tests__/wrModeStorage.test.jsx` — ADR-009's WIP test; **do not touch or delete either**). No other in-flight change edits `App.jsx`, `TopStrip.jsx`, `CommandPalette.jsx`, `keyboard.js` or `useKeyboardLayer.js`; the two un-archived changes that mention `App.jsx` (`fix-recurring-task-isolation`, `remove-plan-my-day`) shipped long ago and are proposal prose only.

The whole change rides one branch, `feat/view-visibility-configuration`, and one PR. Nothing is gated on Anderson (POL-001): a `df-tester` PASS is the acceptance gate, after which the change is merged and archived by the `df-lead` close-out card.
