# Design: fix-today-inline-capture-row

Decisions the build and the verification are held to. Everything here is either measured
from the code at `origin/master` `889a69f` (2026-09-27) or an explicit choice with its
rejected alternatives named.

## §1 Measured baseline

| Fact | Evidence |
|---|---|
| The shell mounts the capture line once, inside `.app-chrome`, above `.app-main` | `src/App.jsx:363-366` |
| The Today list container is `.today-tasks-panel` and is the `data-kbd-list="today"` surface | `src/components/TodayView.jsx:335` |
| The Today panel's first child today is the `OVERDUE` section block (rendered only when `overdueTasks.length > 0`) | `src/components/TodayView.jsx:338-352` |
| The capture contract (Enter / Escape / empty / no reload / `/` / D9) is intact in the component | `src/components/CaptureLine.jsx:44-86` |
| The shell line is styled as chrome — full-width strip, `border-bottom: var(--border)` | `src/components/CaptureLine.css:9-17` |
| A task row is `padding: var(--space-2) var(--space-4)`, hairline bottom border, transparent ground, `--font-row` title | `src/components/TodayView.css:166-186` |
| List navigation reads `[data-kbd-row]` inside `[data-kbd-list]` | `src/components/keyboard.js:127-140` |
| The `/` key and the palette both resolve the input by `.capture-line-input` | `src/components/keyboard.js:169-176`, `src/components/CommandPalette.jsx:162` |
| Dark is declared but **not wired** — the app ships light-only | `src/styles/tokens.css:11-14`, `tokens.css:105` (`:root.dark`), ADR-013 |
| The suite baseline is 32 files / 414 tests / 0 failed (scoped run) | measured 2026-09-27, command in proposal.md |

## §2 Decisions

### D1 — The Today row is the same component in a second variant, and the two mounts are mutually exclusive

`TodayView` renders `<CaptureLine variant="row" projects={projects} onCaptured={onDataChange} />`
as the first child of `.today-tasks-panel`; `App.jsx` renders the shell instance only when
`activeView !== 'today'`.

*Why this and not something else.*

- **Rejected — a React portal** from the shell into a target node inside `TodayView`:
  keeps one logical mount, but the capture row's DOM position then depends on a second
  mechanism (the portal target) that a DOM-order test has to assert through, the shell
  would need a ref into Today's internals, and `TodayView` would still have to render the
  target element. More moving parts for the same observable result.
- **Rejected — a bespoke row written inside `TodayView`**: this is exactly the drift the
  change exists to remove. Two capture implementations means two places to keep the
  create/Escape/empty/defaults contract in parity, and the next change to the capture
  contract would have to remember both.
- **Accepted cost**: because the mounts are exclusive rather than shared, a capture made
  on Today and a capture made on Habits go through two different component instances.
  They cannot diverge in behaviour — it is the same module, the same props and the same
  code path — and the alternative (one shared instance) is the portal above.

The exclusivity is what makes requirement 4 hold: **at most one** `CaptureLine` is mounted
at any time, so "exactly one capture input on Today" is a property of the render, not of a
`display: none` rule. It also keeps the `/` key's document listener single, so no double
handler and no ordering question between two instances.

### D2 — `variant` defaults to `'shell'`

`CaptureLine({ projects, onCaptured, variant = 'shell' })`. Every existing call site and
every existing test that renders the component directly keeps the shell markup — including
the four D9 tests and the `/`-key tests in `src/__tests__/todayQuickCapture.test.jsx:180-252`
and `:120-178`, which render `CaptureLine` with no `variant`. The default is what
requirement 5 ("the shell instance stays as-is on the other five views") is implemented
by: the five other views get the identical component tree they have today.

### D3 — Collapsed means *not rendered*, and focus containment is decided on `focusout`

The project/priority block renders only while `expanded` is true. `expanded` is set by
`onFocus` (React's bubbling `focusin`) on the row wrapper and cleared by `onBlur`
(React's `focusout`) **only when `event.relatedTarget` is outside the row wrapper**.

*Why not rendered instead of `display: none` / `visibility: hidden`*: an unrendered control
cannot be reached by Tab, cannot appear in the accessibility tree and cannot be announced
by a screen reader, so "absent while unfocused" is unambiguous and the assertion is a
plain presence check rather than a computed-style check. It also makes the collapsed state
carry no hidden tab stop, which is the failure mode a `visibility: hidden` toggle would
reintroduce if it were ever flipped to `opacity`/`display` for a transition.

*Why `relatedTarget` containment*: clicking the Project select blurs the input, and
without the containment check the row would collapse out from under the click. The
wrapper is the check's boundary, so focus moving *within* the row (input → select →
select) keeps it expanded, and focus leaving for the page collapses it.

*Keyboard path*: Tab from the input reaches the selects once the row is expanded (the
input's own focus expands it), so a keyboard user reaches both controls without a pointer
— this is what keeps the change compatible with `ui-presentation-system`'s
"reachable without a pointer hover" requirement.

### D4 — The row is **not** a keyboard-layer row and **not** an `.tv-task`

The inline row carries `class="capture-line capture-line--row"` and **no**
`data-kbd-row` attribute; it does not reuse `.tv-task`.

*Why this is a load-bearing constraint, not a style preference.* Two existing behaviours
enumerate rows by selector:

- `moveRowFocus` walks `[data-kbd-row]` inside the nearest `[data-kbd-list]`
  (`src/components/keyboard.js:127-146`). The capture row sits **inside**
  `.today-tasks-panel` = `[data-kbd-list="today"]`, so giving it `data-kbd-row` would make
  the first `j` land on the capture input instead of the first task row.
- `src/__tests__/keyboardLayer.test.jsx:133-135` defines its `rows()` helper as
  `document.querySelectorAll('.tv-task')`, and the suite asserts the first `j` focuses the
  first task row and that focus clamps at the last one. Reusing `.tv-task` would silently
  add a row to that count.

So the visual likeness is achieved in `CaptureLine.css` by *repeating the row's
metrics* from the token layer, not by borrowing the row's class. `keyboardLayer.test.jsx`
is expected to pass **unchanged** — that is the evidence that the keyboard layer was not
disturbed.

### D5 — The row's height does not change on expand, so the list below does not move

The collapsed row's height is set by the input's own box: `padding: var(--space-2)
var(--space-3)` + `font-size: var(--font-row)` + `border: var(--border)`. The revealed
control cluster (caps labels at `--font-label` + selects with `padding: var(--space-1)
var(--space-2)` at `--font-meta`) is **shorter** than the input box, so the row's height is
unchanged between the two states and no constant is introduced.

- At **1440 / 1024 / 768 px** the row lays out on one line: expanding changes no geometry,
  so the first task row below does not move. This is the measurable form of the layout
  constraint.
- At **420 px** the row is allowed to wrap the controls under the input (the input's
  `flex: 1 1 240px` must never be squeezed below a readable width — it keeps
  `min-width: 0` plus its own flex basis, and the wrapper keeps `flex-wrap: wrap`). A
  wrapped row is taller, so at 420 px the "no shift" property is explicitly **waived**:
  usability of the input wins, and the growth is transient and user-initiated (it happens
  on focus, when the user is about to type). The tester asserts no-shift at ≥768 px and
  usability — input width ≥ 200 px, both controls reachable and operable — at 420 px.

### D6 — Where the new tests live

| Claim | File | Test |
|---|---|---|
| The capture row is the first element inside the Today list container | `src/__tests__/todayQuickCapture.test.jsx` | first child of `.today-tasks-panel` **is** the capture row, and it precedes the `OVERDUE` header in document order |
| Exactly one capture input exists on Today | `src/__tests__/App.test.jsx` | `getAllByLabelText(/quick capture task/i)` has length **1** on the cold open (and the existing non-Today test stays green) |
| The controls are revealed by focus | `src/__tests__/todayQuickCapture.test.jsx` | project/priority controls absent while unfocused, present after `focus()`, absent again after blurring to an element outside the row, and **present** after moving focus to the Project select itself |

The DOM-order test must assert **order**, not presence: the assertion is on the container's
child list (element identity / `compareDocumentPosition`), with at least one overdue task
seeded so the `OVERDUE` header is actually in the tree — otherwise the test would pass
against a list that has no header to precede.

### D7 — Why `ui-presentation-system` gets no delta

The new CSS is already bound by that capability's existing token requirement ("no component
stylesheet SHALL introduce a new literal hex, a new font size or a new radius"), and the
"rows replace cards / reachable without hover" requirement's object is *list entries* — the
capture row is not an entry and takes no row action. Writing a delta that restates an
already-satisfied requirement would add a second live copy of rules that must stay in
sync; the drift this change exists to fix is in `today-quick-capture`.

### D8 — Dark mode is verified by forcing the token set, not by shipping a switch

`tokens.css:11-14` and ADR-013 state the app is light-only and the dark set is inert until
a later stage wires a mode selector. The acceptance evidence asks for both themes, so the
tester **forces** the dark set in the headless browser with
`document.documentElement.classList.add('dark')` and screenshots the row in both states.
This is a legibility check of the collapsed/expanded row and its placeholder against the
dark `--surface` — **not** a claim that dark mode ships, and the screenshot captions must
say so.

### D9 — Nothing about the capture contract changes

The create payload (`title`, `dueDate` = today computed at run time, `status: 'pending'`,
optional `projectId`/`priority` from D9 defaults), the Escape/empty/Enter handling, the
`/` focus key, the palette action and the no-reload refresh are untouched. The only new
behaviour in the whole change is the focus reveal, and only in the `row` variant.

## §3 Tests that change, and the deliberate inversion

`src/__tests__/todayQuickCapture.test.jsx:103-117` currently asserts:

> `it('does not leave a second capture line inside TodayView', …)` — rendering `TodayView`
> alone, `screen.queryByLabelText(/quick capture task/i)` is **null**.

That assertion encodes the stage-2 decision the owner has now reversed. It **must be
replaced** by the DOM-order + focus-reveal tests (D6). This is a deliberate inversion of a
gate, not a weakened one: the new assertions are strictly more specific than the old one
(they pin *which* element, in *which* position, with *which* controls revealed, on a page
that also mounts the shell path). The verification card must check the replacement test
fails against the pre-change code — the honest form of "this test would have caught the
bug".

Everything else in the suite is expected to pass **without edits**, and any other test
edit is a signal to stop and re-read this design:

- `src/__tests__/App.test.jsx:122-129` ("keeps the capture line on a non-Today view") and
  `:154-161` ("focuses the capture line when `/` is pressed in the shell") — both still
  find exactly one input; the cold-open one now finds the Today row.
- `src/__tests__/keyboardLayer.test.jsx:152-161`, `:294-310`, `:428-435` — `/`, the
  typing guard and `Ctrl+K` all resolve `.capture-line-input`, which both variants keep.
- `src/__tests__/TodayView.rows.test.jsx`, `src/__tests__/todayOrderSync.test.js` — panel
  and ordering behaviour untouched; the capture row is outside `todayOrder`.

## §4 Rule B — documents to update

Written on the **same branch as the code** (the convention ADR-013 states for the affected
documents):

| File | What changes |
|---|---|
| `.dev_context/DECISION_LOG.md` | **ADR-015** appended at the end of §A — the render-location counter-decision to stage 2, with the owner's reasoning and the rejected portal alternative; a `## Changelog` bullet |
| `.dev_context/ARCHITECTURE.md` | §2 the component tree (`App → Cap` node) and the stage-2 paragraph; §3 the "CaptureLine keeps its own state" bullet; §4.1 the daily-loop flow and its evidence list; §4.6 the `/` row; a `## Changelog` bullet |
| `.dev_context/ROUTE_MAP.md` | §1 opening paragraph, the shell-elements paragraph and the `today` row of the view table ("Quick capture is no longer here" is now false); a `## Changelog` bullet |
| `.dev_context/DATA_MODEL.md` | **untouched** — no schema, column, route or payload change |
| `.dev_context/README.md` | untouched (no rule change) |

The header line stays exactly `Owner: `df-lead`` in every file (POL-007 / ADR-014): the
provenance goes in the tail changelog, never in the header.

## §5 Risks and accepted costs

- **Two mount points is the cost of requirement 5.** Mitigated by one component, one code
  path and the exclusivity test (D1/D6). If a future stage wants a shared instance, the
  portal design in D1 is the re-entry route.
- **The reveal is a focus-only affordance.** A touch user on Today sees the quiet row and
  must tap it before the project/priority controls appear. Accepted: the controls are
  optional refinements of a capture, the row's primary action (type + Enter) needs no
  reveal, and the alternative — always-visible controls on the Today row — is what the
  owner asked to remove.
- **The row is not `data-kbd-row`, so `j`/`k` skip it.** Deliberate (D4): the capture row
  is not a task, and `/` is the key that reaches it. Making it a row would change the
  meaning of the first `j` on Today.
- **`.today-tasks-panel` has `overflow-y: auto`,** so a focus ring on the row can be
  clipped on its left/right edges — the same accepted cosmetic behaviour already recorded
  for task rows in `DECISION_LOG.md` §D. Not this change's to fix; the tester should not
  file it as new.
