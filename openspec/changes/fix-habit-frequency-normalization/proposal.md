## Why

Anderson's Habits view renders his `Gym Session` habit as **"undefinedx per week"** (seen in the QA screenshot of `t_74db36be`). It is a live-data defect with a silent second half:

```
$ sqlite3 "file:C:/git/project_mgmt_tool/data/app.db?mode=ro" \
    "select id,name,typeof(frequency),substr(frequency,1,40) from habits;"
2|Guitar Practice|text|{"type":"daily"}
3|Pull up |text|{"type":"daily"}
4|Meditation|text|{"type":"daily"}
5|Reading|text|{"type":"daily"}
6|Push up|text|{"type":"daily"}
9|Gym Session|text|"{\"type\":\"weekly\"}"     <-- JSON-encoded TWICE (1 row)
```

- `GET /api/habits` runs `JSON.parse(row.frequency)` once (`server/routes/habits.js:11`), so for row 9 the API returns `frequency` as a **string** while every other habit returns an **object**. The API breaks its own documented contract (`.dev_context/DATA_MODEL.md` §1: `frequency` JSON `{"type":"daily"}`).
- `HabitTracker.jsx:247-254` (`getFrequencyLabel`) reads `freq.type` / `freq.timesPerWeek`, so a string falls through to the weekly branch → `` `${undefined}x per week` ``.
- **Silent symptom:** `calculateCurrentStreak` / `calculateLongestStreak` branch on `frequency.type === 'weekly'` (`src/utils/habits.js:42, 153`). A string is not `'weekly'`, so the Gym Session habit's streaks are computed as a **daily** streak and the streak widget advertises the wrong number. `isDateApplicable` (`:13-26`) also falls through to "every day applicable".
- **Latent hazard:** a single unparsable `frequency` cell throws inside `parseHabit`, so `GET /api/habits` — the whole habits view — returns 500 instead of degrading to one bad row.
- **Not self-healing:** `PUT /api/habits/:id` does `JSON.stringify(merged.frequency)` where `merged.frequency` came from the parsed row (`:57, 66`), so a string round-trips and stays double-encoded. The most likely writer is an API client that sent `frequency` as a JSON *string* (the shape shown in the `dayframe` skill's "Create habit body" example): `POST` does `JSON.stringify(b.frequency)` (`:42`) and therefore double-encodes it.

Verified 2026-09-20 read-only against the live DB: **one** cell in **one** table is affected — a scan of every TEXT column of all 17 tables for values starting with `"` returns only `habits.frequency`, row id 9.

## What Changes

- **New pure module `server/habitFrequency.js`** exporting `normalizeFrequency(value)` — one place that turns any stored/attempted `frequency` value into the documented object shape.
- **`server/routes/habits.js`** uses it at all three frequency touch points: `parseHabit` (read), `POST /`, `PUT /:id` (write). As a consequence a `PUT` that omits `frequency` rewrites the stored value correctly — the write path becomes self-healing.
- **No client change** (`HabitTracker.jsx`, `utils/habits.js`, `HabitModal.jsx`, `HabitHeatmap.jsx` keep reading an object, as they already do).
- **No schema change, no migration, no write to `data/app.db`.**

## Capabilities

### New Capabilities
- `habit-frequency-normalization`: the `habits.frequency` contract at the API boundary — always an object, always the three documented types, with usable `timesPerWeek` / `days` defaults.

### Modified Capabilities
- None.

## Impact

- `server/habitFrequency.js` (new, dependency-free — it must not import `server/db.js`, so it can be unit-tested without opening Anderson's live DB).
- `server/routes/habits.js` (3 call sites).
- `src/__tests__/habitFrequency.test.js` (new unit test — the repo's only test home).
- Rule B docs: `.dev_context/DATA_MODEL.md` (§1 habits block, §5 live-DB drift), `.dev_context/ROUTE_MAP.md` (`/api/habits` row), `.dev_context/DECISION_LOG.md` (new ADR + open item).
- Not touched: `src/**`, `server/db.js`, `data/app.db`, any other route.
