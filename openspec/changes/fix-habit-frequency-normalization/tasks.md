## 1. Spec (df-analyst)

- [x] 1.1 Rule A: read `.dev_context/DATA_MODEL.md` §1 (`habits`) and §5 (live-DB drift) before touching the delta
- [x] 1.2 Harden `specs/habit-frequency-normalization/spec.md` — every row of the frozen contract table in `design.md` (D2) now maps to a requirement or scenario; edge cases added: triple- and 4+-layer encodings, malformed JSON, empty-string cell, `'null'`/`'[]'`/`'3'`/`'true'` cells, `{}` / `{type:''}` / `{type:null}` / `{type:'monthly'}` / `{type:'Weekly'}`, `timesPerWeek` = `0` / `-1` / `"0"` / `"3"` / `2.5` / `12` / `true` / `[3]` / `{}`, `days` = `[1,'2',9,1]` / `[0,8]` / `[7,1,3]` / `[]` / missing / non-array / non-integer entries, unknown-key preservation, per-type key ownership, POST/PUT response shape, single-row write isolation, and the no-boot-migration guard (7 requirements, 33 scenarios)
- [x] 1.3 Confirm the requirement bodies satisfy `openspec validate` (SHALL/MUST on the first line of each requirement) and that `openspec validate fix-habit-frequency-normalization` passes — `Change 'fix-habit-frequency-normalization' is valid` (7 requirements / 33 scenarios, `--strict`)
- [x] 1.4 Comment on the card: any place where the frozen contract (design.md D1–D7) is wrong or under-specified — do not silently change a decision — see the `df-analyst` comment on `t_afb383af` (line-number drift in `proposal.md` / `design.md`, the 3-parse unwrap budget, per-type key ownership, `timesPerWeek` numeric-string/non-scalar rule, `2.5` preserved unrounded, empty-label caveat for `days:[]`)

## 2. Implementation (df-fullstack)

- [x] 2.1 Add `server/habitFrequency.js` exporting `normalizeFrequency(value)` per design.md D2 (no imports; total; idempotent; preserves unknown keys)
- [x] 2.2 `server/routes/habits.js`: `parseHabit` uses `normalizeFrequency(row.frequency)` (`:21`); `POST` stores `JSON.stringify(normalizeFrequency(b.frequency))` (`:52`); `PUT` stores `JSON.stringify(normalizeFrequency(merged.frequency))` (`:79`)
- [x] 2.3 Add `src/__tests__/habitFrequency.test.js` (explicit `import { describe, it, expect } from 'vitest'`) covering the whole D2 table, idempotency, and no-throw on garbage input — 26 tests, all green
- [x] 2.4 Reproduce the defect and the repair at the API level against a **copy** of `data/app.db` (never the live file): `GET /api/habits` before (id 9 = string, id 9 = object after), a `PUT` that omits `frequency` rewrote the cell single-encoded (`{`, `json_extract` type=`weekly`/tpw=`1`), `POST` with a string `frequency` stored `{"type":"weekly","timesPerWeek":2}`; a malformed cell answered 500 on `e6c1a91` and 200 + `{type:'daily'}` after
- [x] 2.5 `npm run test:run` · `npm run lint` · `npm run build` — base `e6c1a91`: 27 files / 326 tests / 325 pass / 1 pre-existing failure (MiniWeekBar), 22 lint errors, build exit 0. Change: 28 files / 352 tests / 351 pass / **same single** failure, 22 lint errors, build exit 0
- [x] 2.6 Rule B: `.dev_context/DATA_MODEL.md` §1 + §5, `.dev_context/ROUTE_MAP.md` `/api/habits` row, `.dev_context/DECISION_LOG.md` (ADR-012 + §D open item + `Last updated`)
- [ ] 2.7 Conventional commit(s) on `fix/habit-frequency-normalization`, push, open the PR (base `master`, stacked on #15/#16)

## 3. Verification (df-tester)

- [ ] 3.1 Cold check: boot the new code against a throwaway copy of the live DB (which contains the double-encoded row) and confirm `GET /api/habits` returns `frequency` as an object for id 9
- [ ] 3.2 Confirm the copy — not the live DB — changed after the `PUT` self-heal check; confirm `data/app.db` is byte-identical (or unmodified) afterwards
- [ ] 3.3 Headless browser: the Habits view renders `1x per week` for Gym Session and `Daily` for the other five; the `undefinedx per week` string is gone
- [ ] 3.4 API contract: malformed `frequency` cell → HTTP 200 + `{type:'daily'}` for that row; `POST` with a string `frequency` stores single-encoded; `PUT` omitting `frequency` keeps the stored value shape
- [ ] 3.5 `npm run test:run` / `npm run lint` / `npx vite build` identical to base except for the new passing test file; Rule B docs accurate (every cited line number)
- [ ] 3.6 Report the live-app caveat: the running servers still execute old code, so the real `:5173` view stays broken until the PRs merge and the app restarts
