## Context

`habits.frequency` is a TEXT column holding a JSON object (`server/db.js:66`, `DEFAULT '{"type":"daily"}'`). The API parses it once on read (`server/routes/habits.js:11`) and the client reads `frequency.type` / `frequency.timesPerWeek` / `frequency.days` directly in four places (`HabitTracker.jsx:247-254, 289-290, 390`; `utils/habits.js:13-26, 42, 153`; `HabitHeatmap.jsx:55`; `HabitModal.jsx:9`). Every one of those consumers assumes an object; none of them defends against a string, and the API can hand them a string.

The live DB contains exactly one such row (id 9, `Gym Session`, double-encoded). Because `PUT` stringifies whatever the read path produced, the anomaly persists across edits — it cannot age out.

Data checked read-only on 2026-09-20: all 17 tables × all TEXT columns scanned for values starting with `"` → only `habits.frequency` row 9.

## Goals / Non-Goals

**Goals:**

- `frequency` is an object for **every** habit returned by `GET /api/habits` and `GET /api/habits/:id`, whatever the column holds.
- A `weekly` frequency always carries a usable `timesPerWeek`; a `weekdays` frequency always carries a usable `days` array.
- A malformed or unexpected `frequency` cell degrades to `{type: 'daily'}` for that row instead of failing the request.
- `POST` / `PUT` store a single-encoded object, so a string-shaped write (the probable origin of the defect) is corrected instead of persisted, and an omitted `frequency` on `PUT` rewrites the row correctly.
- The fix is one small, unit-testable function with no database access.

**Non-Goals:**

- Any change under `src/` — the client already reads an object and needs no guard.
- Any schema change, migration or data rewrite; nothing in this change writes to `data/app.db`.
- Repairing the live row by hand (see "Decisions" → live-data repair).
- Touching `trackType` / `count` (settled by `t_74db36be` / ADR-011) or any other route.

## Decisions

**D1 — Normalize at the API boundary, in one dependency-free module.** New `server/habitFrequency.js` exports a single function `normalizeFrequency(value)`. `server/routes/habits.js` calls it in `parseHabit` (read) and in `POST` / `PUT` (write). One function, one contract, every consumer fixed at once. The module must have **no imports** — in particular it must not reach `server/db.js`, which opens the live DB at import time; a unit test has to be able to import it without touching Anderson's data.

**D2 — `normalizeFrequency` contract (frozen for this change):**

| Input (after unwrapping) | Output |
|---|---|
| string that parses to an object | the parsed object, normalized as below |
| string that parses to another string | parsed again (max 2 extra parses), then normalized |
| string that does not parse as JSON | `{type: 'daily'}` |
| `null`, array, number, boolean | `{type: 'daily'}` |
| `{type:'daily'}` | `{type:'daily'}` |
| `{type:'weekly', timesPerWeek:3}` | `{type:'weekly', timesPerWeek:3}` |
| `{type:'weekly'}` (or `timesPerWeek` 0/negative/non-numeric) | `{type:'weekly', timesPerWeek:1}` |
| `{type:'weekdays', days:[1,'2',9,1]}` | `{type:'weekdays', days:[1,2]}` |
| `{type:'weekdays'}` / `days` not an array / no in-range day | `{type:'weekdays', days:[]}` |
| `{type:'monthly'}` or no usable `type` | `{type:'daily'}` |

- Unwrapping is a bounded loop (max 2 extra `JSON.parse` passes) so a triple-encoded cell is still repaired and a maliciously nested one cannot spin.
- Keys other than the normalized ones are preserved (copy, then overwrite the known keys) — the function never truncates a shape it does not know.
- The function is **total** (never throws) and **idempotent** (`normalizeFrequency(normalizeFrequency(x))` deep-equals `normalizeFrequency(x)`; the `PUT` path relies on this because `merged.frequency` is already normalized).
- `timesPerWeek` defaults to `1`, matching the existing defaults in `src/utils/habits.js:94, 205` (`frequency.timesPerWeek || 1`), so the streak maths and the label agree.
- A `weekdays` frequency with an unusable `days` list normalizes to `[]`, which is exactly what `isDateApplicable` (`src/utils/habits.js:22`) already returns for it — no day is invented.

**D3 — Rejected: guard the client label only (`getFrequencyLabel`).** It fixes the visible string and nothing else: the streak calculators would keep treating the habit as daily, the heatmap would keep reading it as daily, and the API would keep violating its documented contract for every future consumer (scripts, cron jobs, agents).

**D4 — Rejected: normalize at the client fetch layer.** The undocumented shape stays on the wire; the next consumer re-discovers the bug. It also spreads the fix across the client for a server-side contract violation.

**D5 — Rejected: write-side validation (reject a non-object `frequency` with HTTP 400).** This is single-user and local, and the write path is *already* documented to accept a JSON string (the `dayframe` skill's "Create habit body" example sends `"frequency": "{\"type\":\"daily\"}"`). A 400 would break a working client path and would still not repair the existing row. Coercion at the boundary is the correct repair; rejection is not.

**D6 — Live-data repair: deliberately not part of this change.** `UPDATE habits SET frequency = ... WHERE id = 9` is a write to Anderson's real data, which needs his explicit call, and after D1/D2 the row is harmless (the API normalizes it on every read) *and* self-heals the next time the habit is saved through the UI (the modal's `PUT` rewrites the column single-encoded). Recorded as an open item in the decision log rather than executed; no card in this chain may write to `data/app.db`, and verification must run against a copy of it.

**D7 — Branch/PR stacking.** #15 (`docs/dev-context-baseline`) and #16 (`fix/habit-count-tracking-persistence`) were open on 2026-09-20 and #16 had already edited the same `parseHabit` region of `server/routes/habits.js`. This branch is therefore cut from `e6c1a91` (PR #16's head), so the diff is additive in that file, `.dev_context/` exists for Rule B, and the merge order is **#15 → #16 → this PR**.

## Risks / Trade-offs

- [Low] Stacked branch: if PR #16 changes before merge, this branch must be rebased. Mitigation: #16 was approved (round 1) before this branch was cut; the file overlap is additive (different functions).
- [Low] Defaulting `timesPerWeek` to `1` shows "1x per week" for the Gym Session habit. It is a display default, not a claim about Anderson's real cadence; he can set the true number in the habit edit modal, which also rewrites the stored row.
- [Low] Preserving unknown keys means a caller can still store junk keys; the route contract only ever reads `type` / `timesPerWeek` / `days`, so this is inert.
- [None] Response shape change affects only rows that were already broken; the five healthy rows parse to identical objects.
