## ADDED Requirements

### Requirement: Habit frequency is returned as an object
`GET /api/habits` (also with `?includeArchived=1`) and `GET /api/habits/:id` SHALL return every habit's `frequency` as a JSON object whatever encoding the `habits.frequency` column holds, decoding at most three JSON layers (the cell itself plus two unwrap passes — `design.md` D2's "max 2 extra parses"), and SHALL answer HTTP 200 even when a cell cannot be decoded at all; a cell still holding a string after the third attempt is not parsed again and is normalized as a non-object.

#### Scenario: Double-encoded row is unwrapped
- **WHEN** a habit row stores the cell text `"{\"type\":\"weekly\"}"` (a JSON string whose contents are the JSON object `{"type":"weekly"}`) — the live `Gym Session` row, id 9
- **THEN** the response `frequency` SHALL be an object, not a string
- **THEN** it SHALL deep-equal `{type: 'weekly', timesPerWeek: 1}`
- **THEN** `HabitTracker.jsx:247-254` (`getFrequencyLabel`) SHALL render `1x per week` for that habit; the string `undefinedx per week` SHALL NOT appear anywhere in the Habits view

#### Scenario: Triple-encoded row is unwrapped
- **WHEN** a cell stores `"\"{\\\"type\\\":\\\"weekly\\\"}\""` (three nested encodings of the same object — the second unwrap pass)
- **THEN** the response `frequency` SHALL deep-equal `{type: 'weekly', timesPerWeek: 1}`

#### Scenario: Deeper encodings fall back to daily instead of looping
- **WHEN** a cell stores four or more nested encodings
- **THEN** `GET /api/habits` SHALL answer HTTP 200
- **THEN** that row's `frequency` SHALL deep-equal `{type: 'daily'}` (no fourth parse; the loop is bounded)

#### Scenario: Ordinary row is unchanged
- **WHEN** a row stores the cell text `{"type":"daily"}` (the column `DEFAULT`, `server/db.js:66`)
- **THEN** the response `frequency` SHALL deep-equal `{type: 'daily'}`
- **THEN** the other five live habits (ids 2, 3, 4, 5, 6) SHALL come back with byte-identical `frequency` values to the pre-change response

#### Scenario: Unparsable cell does not break the list
- **WHEN** any row's `frequency` cell is not valid JSON (`{oops`, `{"type":`, a truncated object)
- **THEN** `GET /api/habits` SHALL answer HTTP 200
- **THEN** that row's `frequency` SHALL deep-equal `{type: 'daily'}`
- **THEN** every other row SHALL still be present in the response, in `sortOrder` (the response SHALL NOT be an error document or an empty list)

#### Scenario: Empty-string cell falls back to daily
- **WHEN** a row's `frequency` cell is the empty string `''`
- **THEN** that row's `frequency` SHALL deep-equal `{type: 'daily'}`

#### Scenario: Non-object JSON falls back to daily
- **WHEN** the cell is `'null'`, `'[]'`, `'3'` or `'true'` (parsing to `null`, an array, a number, a boolean)
- **THEN** that row's `frequency` SHALL deep-equal `{type: 'daily'}`
- **THEN** the client SHALL never receive `null`: `JSON.parse('null')` returns `null`, and `getFrequencyLabel` dereferences `freq.type` (`HabitTracker.jsx:248`), which would throw and unmount the Habits view

#### Scenario: Unknown or non-usable type falls back to daily
- **WHEN** the decoded value is `{}`, `{type: ''}`, `{type: null}`, `{type: 'monthly'}` or `{type: 'Weekly'}`
- **THEN** that row's `frequency` SHALL deep-equal `{type: 'daily'}`
- **THEN** the type match SHALL be exact and case-sensitive against `daily` / `weekly` / `weekdays`, following the exact-match precedent of `normalizeTrackType` (`server/routes/habits.js:10-12`)

#### Scenario: Single-row read is normalized too
- **WHEN** `GET /api/habits/9` is requested against a DB whose row 9 cell is double-encoded
- **THEN** the response `frequency` SHALL deep-equal `{type: 'weekly', timesPerWeek: 1}`

### Requirement: Weekly frequency carries a usable timesPerWeek
A `frequency` of type `weekly` SHALL carry a positive finite **number** in `timesPerWeek`, defaulting to `1` when the stored value is missing, zero, negative, non-finite, an array, a boolean, an object, a non-numeric string, or an empty string.

#### Scenario: Missing timesPerWeek defaults to one
- **WHEN** a `weekly` frequency has no `timesPerWeek` (the live Gym Session row)
- **THEN** the returned `frequency.timesPerWeek` SHALL be `1` (a number, not the string `'1'`)
- **THEN** `getFrequencyLabel` SHALL render `1x per week`, not `undefinedx per week`

#### Scenario: Unusable timesPerWeek defaults to one
- **WHEN** `timesPerWeek` is `0`, `-1`, `"0"`, `''`, `"abc"`, `null`, `true`, `[3]` or `{}`
- **THEN** the returned `frequency.timesPerWeek` SHALL be `1` for every one of those inputs
- **THEN** `[3]` and `true` SHALL be treated as unusable even though JavaScript would coerce them to `3` and `1` — the contract accepts only numbers and numeric strings

#### Scenario: Numeric string is accepted and coerced to a number
- **WHEN** `timesPerWeek` is `"3"` or `" 3 "`
- **THEN** the returned `frequency.timesPerWeek` SHALL be the number `3`

#### Scenario: Valid numbers are preserved unrounded and unclamped
- **WHEN** `timesPerWeek` is `3`, `2.5` or `12`
- **THEN** the returned values SHALL be `3`, `2.5` and `12` respectively
- **THEN** `2.5` SHALL NOT be rounded and `12` SHALL NOT be clamped: the `1`–`7` range is a modal affordance only (`HabitModal.jsx:144-147`), not an API rule

#### Scenario: A healthy weekly object round-trips unchanged
- **WHEN** the input is `{type:'weekly', timesPerWeek:3}`
- **THEN** the normalized result SHALL deep-equal `{type:'weekly', timesPerWeek:3}`

### Requirement: Weekdays frequency carries only valid ISO days
A `frequency` of type `weekdays` SHALL carry a `days` array holding only whole numbers from `1` (Monday) to `7` (Sunday), deduplicated and ascending, and `[]` when no entry is usable; an entry is usable only when it is an integer `1`–`7` or a string of digits parsing to such an integer, and out-of-range, fractional, boolean, `null`, array, object and non-numeric entries SHALL be dropped rather than repaired, so that no day is invented.

#### Scenario: Mixed values are filtered, deduplicated and sorted
- **WHEN** `days` is `[1, '2', 9, 1]`
- **THEN** the returned `frequency.days` SHALL be `[1, 2]`
- **THEN** an implementation that filters only (yielding `[1, 2, 1]`) SHALL fail this scenario

#### Scenario: Out-of-range days are dropped
- **WHEN** `days` is `[0, 8]`
- **THEN** the returned `frequency.days` SHALL be `[]`

#### Scenario: Unordered days are sorted ascending
- **WHEN** `days` is `[7, 1, 3]`
- **THEN** the returned `frequency.days` SHALL be `[1, 3, 7]`

#### Scenario: Entries that are neither integers nor digit strings are dropped
- **WHEN** `days` is `[2.5, true, null, [3], 'x', '', '1.0']`
- **THEN** the returned `frequency.days` SHALL be `[]`

#### Scenario: Unusable days list becomes empty
- **WHEN** `days` is absent, is not an array (`3`, `'1,2'`, `{...}`), or is `[]`
- **THEN** the returned `frequency.days` SHALL be `[]`
- **THEN** `isDateApplicable` (`src/utils/habits.js:13-26`) SHALL keep returning `false` for every date, as it already does for this shape — no day becomes clickable in the heatmap

#### Scenario: A valid days list round-trips unchanged
- **WHEN** the input is `{type:'weekdays', days:[1,3,5]}`
- **THEN** the normalized result SHALL deep-equal `{type:'weekdays', days:[1,3,5]}`

### Requirement: Normalization preserves keys it does not own
A normalized `frequency` SHALL preserve every key it does not manage, and each frequency type SHALL write only the keys that type owns — `weekly` writes `timesPerWeek`, `weekdays` writes `days`, `daily` writes neither.

#### Scenario: Extra keys survive
- **WHEN** the input is `{type:'weekly', timesPerWeek:3, anchor:'2026-01-05', label:'gym'}`
- **THEN** the normalized result SHALL deep-equal `{type:'weekly', timesPerWeek:3, anchor:'2026-01-05', label:'gym'}`

#### Scenario: Another type's key is copied, not normalized and not dropped
- **WHEN** the input is `{type:'daily', days:[1,'x'], timesPerWeek:0}`
- **THEN** the normalized result SHALL deep-equal `{type:'daily', days:[1,'x'], timesPerWeek:0}` (both keys are inert: `isDateApplicable` returns `true` for `daily` before it looks at `days`, `src/utils/habits.js:14`; the streak functions branch on `type` first, `:42`, `:153`)

### Requirement: Habit writes store a single-encoded object
`POST /api/habits` and `PUT /api/habits/:id` SHALL persist `frequency` as the JSON text of a normalized object so that no write can ever store it double-encoded, and the response body of both calls SHALL carry `frequency` as an object.

#### Scenario: String-shaped write is corrected
- **WHEN** a client POSTs `frequency` as the string `{"type":"weekly","timesPerWeek":2}` (the shape the `dayframe` skill's "Create habit body" example sends, and the probable origin of the defect)
- **THEN** the `POST` response `frequency` SHALL deep-equal `{type:'weekly', timesPerWeek:2}`
- **THEN** a subsequent `GET /api/habits/:id` SHALL return the same object
- **THEN** the stored cell SHALL begin with `{`, not `"`

#### Scenario: Omitting frequency on POST stores daily
- **WHEN** `POST` is called with no `frequency`, or with `null`, or with `''`
- **THEN** the created row's stored cell SHALL be the JSON text of `{type:'daily'}` and the response `frequency` SHALL deep-equal `{type:'daily'}`

#### Scenario: PUT with no frequency rewrites the row correctly
- **WHEN** a habit whose stored cell is `"{\"type\":\"weekly\"}"` is updated with a body that omits `frequency`
- **THEN** the stored cell SHALL become single-encoded: `substr(frequency,1,1)` SHALL be `{`, `json_extract(frequency,'$.type')` SHALL be `weekly`, `json_extract(frequency,'$.timesPerWeek')` SHALL be `1`
- **THEN** the response `frequency` SHALL deep-equal `{type:'weekly', timesPerWeek:1}`
- **THEN** `HabitTracker.jsx:247-254` SHALL render `1x per week` for that habit on the next load
- **THEN** `HabitModal.jsx:8-19` SHALL prefill the "X times per week" radio with `1` (today the string leaves `freqType` undefined, so **no** radio is checked and the number box starts at the `:19` default of `3`)

#### Scenario: PUT with a string-shaped frequency stores an object
- **WHEN** `PUT` sends `frequency` as the string `{"type":"weekdays","days":[1,"2",9]}`
- **THEN** the stored cell SHALL be single-encoded and `json_extract(frequency,'$.days')` SHALL be `[1,2]`
- **THEN** the response `frequency` SHALL deep-equal `{type:'weekdays', days:[1,2]}`

#### Scenario: No write path can double-encode
- **WHEN** any sequence of `POST` / `PUT` calls is performed with a string-, object- or garbage-shaped `frequency`
- **THEN** the stored cell SHALL never begin with the `"` character

#### Scenario: A write touches only its own row
- **WHEN** the self-healing `PUT` above rewrites habit 9
- **THEN** every other row of `habits` SHALL have a byte-identical `frequency` cell before and after

### Requirement: Normalization is total and idempotent
`normalizeFrequency` SHALL NOT throw for any input and SHALL be idempotent, because the `PUT` path feeds an already-normalized value back in (`merged = {...parseHabit(existing), ...b}` → `JSON.stringify(merged.frequency)`, `server/routes/habits.js:67`, `:75`).

#### Scenario: No input throws
- **WHEN** the input is `undefined`, `null`, `''`, `'{oops'`, `3`, `true`, `[]`, `{}`, an object whose `type` is another object, or a five-layer nested JSON string
- **THEN** the call SHALL return an object without throwing
- **THEN** the returned object's `type` SHALL be one of `daily`, `weekly`, `weekdays`

#### Scenario: Second pass changes nothing
- **WHEN** the output of `normalizeFrequency` is passed back into it
- **THEN** the result SHALL deep-equal the first output, for at least `{type:'daily'}`, `{type:'weekly', timesPerWeek:1}`, `{type:'weekly', timesPerWeek:2.5}`, `{type:'weekdays', days:[1,2]}`, `{type:'weekdays', days:[]}` and `{type:'weekly', timesPerWeek:3, anchor:'x'}`

### Requirement: Normalization is read-only and triggers no data migration
Reading or normalizing a habit SHALL NOT write to `habits`, and no part of this change SHALL modify Anderson's live `data/app.db` outside the writes the existing route handlers already perform.

#### Scenario: Read path is read-only
- **WHEN** `GET /api/habits` normalizes a double-encoded row
- **THEN** the stored cell SHALL be unchanged after the request — for row 9, `quote(frequency)` SHALL still be `'"{\"type\":\"weekly\"}"'` and `json_extract(frequency,'$.type')` SHALL still be NULL
- **THEN** the `data/app.db` file SHALL be unchanged for a read-only request (compare its md5 before and after)

#### Scenario: No boot-time rewrite of stored frequencies
- **WHEN** the server boots against a DB that still contains the double-encoded row 9
- **THEN** the cell SHALL still be double-encoded afterwards
- **THEN** `server/db.js` SHALL NOT gain a `habits.frequency` repair migration: the three boot rewrites it already runs are documented in `.dev_context/DATA_MODEL.md` §2, and the self-heal in this change belongs to the `PUT` route, not to boot

#### Scenario: The self-heal is the only write, and it is the route's
- **WHEN** the change is reviewed (`git diff --stat` against the base `e6c1a91`)
- **THEN** only `server/habitFrequency.js`, `server/routes/habits.js`, `src/__tests__/habitFrequency.test.js` and the Rule B `.dev_context/` files SHALL differ
- **THEN** no `UPDATE habits SET frequency = … WHERE id = 9` SHALL be run against `data/app.db` by any card in this chain (D6 — that repair is Anderson's call)
