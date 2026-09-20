## ADDED Requirements

### Requirement: Habit frequency is returned as an object
`GET /api/habits` and `GET /api/habits/:id` SHALL return each habit's `frequency` as a JSON object, whatever encoding the `habits.frequency` column holds.

#### Scenario: Double-encoded row is unwrapped
- **WHEN** a habit row stores `frequency` as `"{\"type\":\"weekly\"}"` (a JSON string containing a JSON object)
- **THEN** the response `frequency` SHALL be an object, not a string
- **THEN** for `Gym Session` (live row id 9) it SHALL be `{type: 'weekly', timesPerWeek: 1}`

#### Scenario: Ordinary row is unchanged
- **WHEN** a row stores `{"type":"daily"}`
- **THEN** the response `frequency` SHALL be `{type: 'daily'}`

#### Scenario: Triple-encoded row is unwrapped
- **WHEN** a row stores a JSON string that parses to another JSON string of an object
- **THEN** the response `frequency` SHALL be that object

#### Scenario: Unparsable row does not break the list
- **WHEN** any row's `frequency` cell is not valid JSON
- **THEN** `GET /api/habits` SHALL answer HTTP 200
- **THEN** that row's `frequency` SHALL be `{type: 'daily'}`

#### Scenario: Non-object JSON falls back to daily
- **WHEN** a row's `frequency` parses to `null`, an array, a number or a boolean
- **THEN** that row's `frequency` SHALL be `{type: 'daily'}`

#### Scenario: Unknown frequency type falls back to daily
- **WHEN** a row's `frequency` is `{type: 'monthly'}` or carries no usable `type`
- **THEN** that row's `frequency` SHALL be `{type: 'daily'}`

### Requirement: Weekly frequency carries a usable timesPerWeek
A `frequency` of type `weekly` SHALL carry a positive finite `timesPerWeek`, defaulting to `1`.

#### Scenario: Missing timesPerWeek defaults to one
- **WHEN** a `weekly` frequency has no `timesPerWeek`
- **THEN** the returned `frequency.timesPerWeek` SHALL be `1`
- **THEN** `getFrequencyLabel` renders `1x per week` rather than `undefinedx per week`

#### Scenario: Invalid timesPerWeek defaults to one
- **WHEN** `timesPerWeek` is `0`, negative, or non-numeric
- **THEN** the returned `frequency.timesPerWeek` SHALL be `1`

#### Scenario: Valid timesPerWeek is preserved
- **WHEN** `timesPerWeek` is `3`
- **THEN** the returned `frequency.timesPerWeek` SHALL be `3`

### Requirement: Weekdays frequency carries only valid ISO days
A `frequency` of type `weekdays` SHALL carry a `days` array containing only integers from `1` (Monday) to `7` (Sunday), deduplicated and ascending, and `[]` when no day is usable.

#### Scenario: Mixed values are filtered
- **WHEN** `days` is `[1, '2', 9, 1]`
- **THEN** the returned `frequency.days` SHALL be `[1, 2]`

#### Scenario: Unusable days list becomes empty
- **WHEN** `days` is absent or is not an array
- **THEN** the returned `frequency.days` SHALL be `[]`
- **THEN** `isDateApplicable` SHALL keep returning `false` for every date, as it already does for this shape

### Requirement: Habit writes store a single-encoded object
`POST /api/habits` and `PUT /api/habits/:id` SHALL persist `frequency` as the JSON text of a normalized object, so a write can never store the value double-encoded.

#### Scenario: String-shaped write is corrected
- **WHEN** a client POSTs `frequency` as the string `{"type":"weekly","timesPerWeek":2}`
- **THEN** a subsequent `GET /api/habits/:id` SHALL return `frequency` as `{type: 'weekly', timesPerWeek: 2}`

#### Scenario: PUT with no frequency rewrites the row correctly
- **WHEN** a habit whose stored cell is double-encoded is updated with a body that omits `frequency`
- **THEN** the stored value SHALL become the single-encoded normalized object
- **THEN** the response `frequency` SHALL be an object

### Requirement: Normalization is total and idempotent
`normalizeFrequency` SHALL NOT throw for any input and SHALL be idempotent.

#### Scenario: No input throws
- **WHEN** the input is `undefined`, `null`, an empty string, `'{oops'`, a number, an array or a deeply nested string
- **THEN** the call SHALL return `{type: 'daily'}` or another valid normalized object without throwing

#### Scenario: Second pass changes nothing
- **WHEN** a normalized object is passed back into `normalizeFrequency`
- **THEN** the result SHALL deep-equal the input

### Requirement: Normalization never writes to the database
Reading or normalizing a habit SHALL NOT write to `habits`, and no part of this change SHALL modify Anderson's live `data/app.db`.

#### Scenario: Read path is read-only
- **WHEN** `GET /api/habits` normalizes a double-encoded row
- **THEN** the stored cell SHALL be unchanged after the request
