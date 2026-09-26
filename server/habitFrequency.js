// Habit frequency normalization — the `habits.frequency` contract at the API boundary.
//
// The column is TEXT holding a JSON object, but a client can (and did) store a JSON
// *string* of that object, and a `PUT` used to round-trip whatever the read path
// produced. Every consumer (the frequency label, the streak maths, the heatmap, the
// edit modal) assumes an object, so the shape is normalized here — once — instead of
// being defended against in five places.
//
// No imports on purpose: `server/db.js` opens Anderson's live DB at import time, and a
// unit test must be able to import this module without touching his data.
//
// Contract (design.md D2): total (never throws) and idempotent, because the `PUT` route
// feeds an already-normalized value back in.

const TYPES = ['daily', 'weekly', 'weekdays'];
const DEFAULT_FREQUENCY = Object.freeze({ type: 'daily' });

// A cell may be encoded more than once (the live `Gym Session` row is encoded twice).
// The unwrap is bounded so a maliciously nested cell cannot spin: the cell itself plus
// two unwrap passes, after which a still-string value is treated as a non-object.
const MAX_PARSES = 3;

/**
 * Decode a stored/attempted frequency value into a JS value.
 * @returns the decoded value, or `undefined` when it cannot be decoded at all
 */
function decode(value) {
  let current = value;

  for (let attempt = 0; attempt < MAX_PARSES; attempt += 1) {
    if (typeof current !== 'string') return current;
    try {
      current = JSON.parse(current);
    } catch {
      // Not valid JSON at this layer — nothing usable to decode ('' lands here too).
      return undefined;
    }
  }

  // Still a string after the bounded number of passes: deeper encodings degrade to daily.
  return typeof current === 'string' ? undefined : current;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `timesPerWeek` accepts a positive finite number, or a string of digits that parses to
 * one. Everything else — including `true` and `[3]`, which JavaScript would coerce —
 * falls back to 1, and the number is preserved unrounded and unclamped (the 1-7 range is
 * a modal affordance only).
 */
function normalizeTimesPerWeek(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 1;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return 1;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }
  return 1;
}

/**
 * `days` holds only whole ISO days (1=Mon … 7=Sun), deduplicated and ascending. An entry
 * is usable when it is an integer 1-7 or a string of digits parsing to one; fractional,
 * out-of-range, boolean, `null`, array, object and non-numeric entries are dropped rather
 * than repaired, so no day is invented. An unusable list becomes `[]`, which is exactly
 * what `isDateApplicable` already returns for that shape.
 */
function normalizeDays(value) {
  if (!Array.isArray(value)) return [];

  const days = new Set();
  for (const entry of value) {
    if (typeof entry === 'number') {
      if (Number.isInteger(entry) && entry >= 1 && entry <= 7) days.add(entry);
      continue;
    }
    if (typeof entry === 'string' && /^\d+$/.test(entry.trim())) {
      const parsed = Number(entry.trim());
      if (parsed >= 1 && parsed <= 7) days.add(parsed);
    }
  }

  return [...days].sort((a, b) => a - b);
}

/**
 * Turn any stored or attempted `frequency` value into the documented object shape.
 * Always returns one of `{type:'daily'}`, `{type:'weekly', timesPerWeek}` or
 * `{type:'weekdays', days}` — never throws, and idempotent.
 *
 * Keys the function does not own are copied through untouched (each type writes only the
 * keys it owns: `weekly` writes `timesPerWeek`, `weekdays` writes `days`, `daily` neither).
 *
 * @param {*} value - a stored cell (string, possibly encoded more than once) or a request body value
 * @returns {{type: string}} the normalized frequency object
 */
export function normalizeFrequency(value) {
  const decoded = decode(value);

  if (!isPlainObject(decoded) || !TYPES.includes(decoded.type)) {
    return { ...DEFAULT_FREQUENCY };
  }

  if (decoded.type === 'weekly') {
    return { ...decoded, timesPerWeek: normalizeTimesPerWeek(decoded.timesPerWeek) };
  }

  if (decoded.type === 'weekdays') {
    return { ...decoded, days: normalizeDays(decoded.days) };
  }

  return { ...decoded };
}
