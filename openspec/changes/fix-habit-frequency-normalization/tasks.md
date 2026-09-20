## 1. Spec (df-analyst)

- [ ] 1.1 Rule A: read `.dev_context/DATA_MODEL.md` §1 (`habits`) and §5 (live-DB drift) before touching the delta
- [ ] 1.2 Harden `specs/habit-frequency-normalization/spec.md` — verify every row of the frozen contract table in `design.md` (D2) has a requirement or scenario; add the missing edge cases (triple-encoded string, `null`, array, `weekdays` with `days:[1,'2',9,1]`, `timesPerWeek: 0`, unknown `type`, malformed JSON)
- [ ] 1.3 Confirm the requirement bodies satisfy `openspec validate` (SHALL/MUST on the first line of each requirement) and that `openspec validate fix-habit-frequency-normalization` passes
- [ ] 1.4 Comment on the card: any place where the frozen contract (design.md D1–D7) is wrong or under-specified — do not silently change a decision

## 2. Implementation (df-fullstack)

- [ ] 2.1 Add `server/habitFrequency.js` exporting `normalizeFrequency(value)` per design.md D2 (no imports; total; idempotent; preserves unknown keys)
- [ ] 2.2 `server/routes/habits.js`: `parseHabit` uses `normalizeFrequency(row.frequency)`; `POST` stores `JSON.stringify(normalizeFrequency(b.frequency))`; `PUT` stores `JSON.stringify(normalizeFrequency(merged.frequency))`
- [ ] 2.3 Add `src/__tests__/habitFrequency.test.js` (explicit `import { describe, it, expect } from 'vitest'`) covering the whole D2 table, idempotency, and no-throw on garbage input
- [ ] 2.4 Reproduce the defect and the repair at the API level against a **copy** of `data/app.db` (never the live file): `GET /api/habits` before/after, a `PUT` that omits `frequency` rewrites the row single-encoded, `POST` with a string `frequency` stores an object
- [ ] 2.5 `npm run test:run` · `npm run lint` · `npx vite build` — compare against base `e6c1a91` and say which failures are pre-existing
- [ ] 2.6 Rule B: `.dev_context/DATA_MODEL.md` §1 + §5, `.dev_context/ROUTE_MAP.md` `/api/habits` row, `.dev_context/DECISION_LOG.md` (new ADR + open item + `Last updated`)
- [ ] 2.7 Conventional commit(s) on `fix/habit-frequency-normalization`, push, open the PR (base `master`, stacked on #15/#16)

## 3. Verification (df-tester)

- [ ] 3.1 Cold check: boot the new code against a throwaway copy of the live DB (which contains the double-encoded row) and confirm `GET /api/habits` returns `frequency` as an object for id 9
- [ ] 3.2 Confirm the copy — not the live DB — changed after the `PUT` self-heal check; confirm `data/app.db` is byte-identical (or unmodified) afterwards
- [ ] 3.3 Headless browser: the Habits view renders `1x per week` for Gym Session and `Daily` for the other five; the `undefinedx per week` string is gone
- [ ] 3.4 API contract: malformed `frequency` cell → HTTP 200 + `{type:'daily'}` for that row; `POST` with a string `frequency` stores single-encoded; `PUT` omitting `frequency` keeps the stored value shape
- [ ] 3.5 `npm run test:run` / `npm run lint` / `npx vite build` identical to base except for the new passing test file; Rule B docs accurate (every cited line number)
- [ ] 3.6 Report the live-app caveat: the running servers still execute old code, so the real `:5173` view stays broken until the PRs merge and the app restarts
