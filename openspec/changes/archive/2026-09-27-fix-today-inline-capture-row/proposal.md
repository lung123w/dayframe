## Why

Owner request (2026-09-27, with a screenshot): *"i want this feature 'capture a task' in
today page to be more intuitive… i want to type directly on top of the to-do items"*.

This is a **spec-compliance defect, not a new feature**.
`openspec/specs/today-quick-capture/spec.md` already says:

> The shared shell SHALL provide an always-visible inline capture line that is present on
> every view; **on the Today view it SHALL sit at the top of the task list.**

The app does not do that. Stage 2 of `ui-modernization-calm-canvas` moved `CaptureLine`
out of `TodayView.jsx` and into the app shell (`src/App.jsx:363-366`, inside
`.app-chrome`, above `.app-main`), so on Today the control renders as a global toolbar
strip **above the "Today" panel** — visually detached from the list it feeds. The
component's own doc comment states the intent (`src/components/CaptureLine.jsx:11-12`:
*"It used to live inside `TodayView.jsx`; it now sits in the shell so it is present on
every view, and Today no longer owns a second one"*).

**Root cause is render location, not behaviour.** The capture contract itself is intact
(Enter creates with today's Hong Kong date, `status: 'pending'`, input clears, Escape
clears, empty ignored, `/` focuses, D9 defaults inherited). `CaptureLine.css` (77 lines)
styles it as chrome — `border-bottom: var(--border)` on a full-width strip
(`CaptureLine.css:9-17`).

## What already exists — do not rebuild it

Every acceptance clause the spec already carries is satisfied today, and this change
must leave all of them alone:

| Behaviour | Where it lives now |
|---|---|
| Enter creates, `dueDate` = today's HK date computed at run time, `status: 'pending'` | `CaptureLine.jsx:66-82` |
| Escape clears, empty input ignored, input clears after capture | `CaptureLine.jsx:66-85` |
| `/` focuses the line from any view (guarded against typing/overlay contexts) | `CaptureLine.jsx:44-56`, `keyboard.js:169-176` |
| D9 capture defaults (`localStorage['dayframe.captureDefaults']`) | `CaptureLine.jsx:31-64`, `captureDefaults.js` |
| Command-palette entry "Focus the capture line" | `CommandPalette.jsx:162`, `keyboard.js:52` |
| The new task appears without a reload | `onCaptured` → `App.jsx` `loadData` |

## What Changes

1. **`src/components/CaptureLine.jsx`** — gains a `variant` prop, default `'shell'`:
   - `variant="shell"` (the default, five views): **byte-for-byte the behaviour and
     markup of today's shell line**, project + priority controls always visible.
   - `variant="row"` (Today): the same component, the same contract, but a quiet
     collapsed row — the project/priority controls are **not rendered** until focus
     enters the row (`focusin`), and collapse again when focus leaves it for a target
     outside the row (`focusout` + `relatedTarget` containment).
2. **`src/components/TodayView.jsx`** — renders `<CaptureLine variant="row"
   projects={projects} onCaptured={onDataChange} />` as the **first child of
   `.today-tasks-panel`** (`data-kbd-list="today"`, `TodayView.jsx:335`), i.e. above the
   `OVERDUE` section block (`TodayView.jsx:339-352`).
3. **`src/App.jsx`** — the shell `CaptureLine` renders only when
   `activeView !== 'today'`. The two mounts are mutually exclusive, so **exactly one**
   capture input exists on any view; the `/` key, the palette action and
   `document.querySelector('.capture-line-input')` all keep working untouched.
4. **`src/components/CaptureLine.css`** — a `.capture-line--row` block painted from
   `src/styles/tokens.css` names only: same horizontal rhythm, row border and type scale
   as `.tv-task`, so the control reads as the first row of the list rather than as chrome.
5. **Tests** — two new assertions (DOM order inside the Today list + exactly one input on
   Today) and one focus-reveal assertion; **one existing assertion is deliberately
   inverted** (see design.md §3).
6. **Docs (Rule B)** — `.dev_context/DECISION_LOG.md` records the render-location
   decision (ADR-015, the counter-decision to stage 2's "one line in the shell");
   `ARCHITECTURE.md` §2/§3/§4.1 and `ROUTE_MAP.md` §1 drop the now-false
   "quick capture is no longer here / is a shell element on every view" claims.

## Non-goals

- **No new capability and no new dependency.** No styling library, no animation library,
  no headless UI package.
- **No keyboard-layer change.** No binding is added, removed or re-mapped: `/`, `j`/`k`,
  `x`, `t`, `u`, `g`-chord, `Escape`, `Ctrl/⌘+K` keep their owners. The capture row
  deliberately carries **no** `data-kbd-row` and **no** `.tv-task` class (design.md D4),
  so `j`/`k` navigation and the existing keyboard-layer tests are untouched.
- **No API, no schema, no `src/api.js`, no `server/` change.** Capture already writes
  through `POST /api/tasks`; nothing about the payload changes.
- **The other five views are not repainted.** The shell line's chrome is out of scope;
  only Today's instance changes shape.
- **No drag-and-drop.** The capture row is not draggable and is not part of `todayOrder`.

## Capabilities

### Modified Capabilities

- `today-quick-capture` — the requirement *User can capture a task by typing a title and
  pressing Enter* is restated so the Today instance is the **first row of the Today task
  list**, styled as a task row, with its project/priority controls revealed on focus; the
  other five views keep the shell line with the controls always visible.

### New Capabilities

(none)

### Capabilities deliberately NOT touched

- `ui-presentation-system` — no new rule is introduced. The two requirements that could
  be read as covering this change already bind it: *"A single token layer supplies every
  presentation value"* (`no component stylesheet SHALL introduce a new literal hex, a new
  font size or a new radius`) and *"Rows replace cards and every row action is reachable
  without a pointer hover"* (the capture row is not a list entry, so that requirement's
  object is unchanged). Adding a delta here would restate a requirement that is already
  satisfied — the drift this change fixes is in `today-quick-capture`.

## Impact

- **New files**: `openspec/changes/fix-today-inline-capture-row/` (proposal, design,
  tasks, spec delta).
- **Modified files (implementation phase)**:
  - `src/components/CaptureLine.jsx` — the `variant` prop, the focus-reveal state, the
    collapsed/expanded markup.
  - `src/components/CaptureLine.css` — the `.capture-line--row` block.
  - `src/components/TodayView.jsx` — one import and one element at the top of
    `.today-tasks-panel`.
  - `src/App.jsx` — gate the shell line on `activeView !== 'today'`.
  - `src/__tests__/todayQuickCapture.test.jsx` — invert one assertion, add the DOM-order
    and focus-reveal tests.
  - `src/__tests__/App.test.jsx` — add the exactly-one-input assertion on Today.
- **Docs**: `.dev_context/DECISION_LOG.md` (ADR-015), `.dev_context/ARCHITECTURE.md`,
  `.dev_context/ROUTE_MAP.md`. `DATA_MODEL.md` is untouched — no schema change.
- **Backward compatibility**: fully compatible. No stored data, no request shape and no
  route changes; the capture payload and the localStorage key are identical.
- **Baseline to beat** (measured 2026-09-27 on `origin/master` = `889a69f`, Node v22.23.2):
  `npx vitest run --exclude='**/.worktrees/**' --exclude='not relevant/**'` →
  **32 files / 414 tests / 0 failed**. The two excludes matter: `.worktrees/` holds other
  lanes' checkouts and `not relevant/CodeNomad/` is an untracked leftover that fails to
  transform (2 files) — neither is this change's business.

## Workflow

Branch `fix/today-inline-capture-row` → PR → merge. `master` stays clean (POL-002).
The `df-tester` verification card is the acceptance gate and closes the change; there is
no human gate (POL-001 / zero-human-gate policy).
