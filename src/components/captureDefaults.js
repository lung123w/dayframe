/**
 * Capture-line preference (design.md §5 D9) — client-only, no API, no schema.
 *
 * `localStorage['dayframe.captureDefaults']` = `{"projectId": <number|null>,
 * "priority": "low"|"medium"|"high"}`. Read on capture, written whenever a
 * capture or an edit sets either value.
 *
 * It lives beside the component rather than in `src/utils/` because this
 * stage's fence keeps every `src/utils/*` file untouched — nothing here is a
 * date, ordering or recurrence rule.
 */

const STORAGE_KEY = 'dayframe.captureDefaults';
const DEFAULT_PRIORITY = 'medium';
const PRIORITIES = ['low', 'medium', 'high'];

/** Fired after a write so a mounted capture line re-reads the stored defaults. */
export const CAPTURE_DEFAULTS_EVENT = 'dayframe:captureDefaults';

/** The documented fallback (D9): no project, `medium`. */
export const CAPTURE_DEFAULTS = { projectId: null, priority: DEFAULT_PRIORITY };

/** Read the preference; a missing or unparseable value falls back to D9's defaults. */
export function readCaptureDefaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...CAPTURE_DEFAULTS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...CAPTURE_DEFAULTS };

    return {
      projectId: Number.isInteger(parsed.projectId) ? parsed.projectId : null,
      priority: PRIORITIES.includes(parsed.priority) ? parsed.priority : DEFAULT_PRIORITY,
    };
  } catch {
    return { ...CAPTURE_DEFAULTS };
  }
}

/** Persist the preference. Never throws: a blocked storage must not break a capture. */
export function writeCaptureDefaults({ projectId, priority }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projectId: Number.isInteger(projectId) ? projectId : null,
      priority: PRIORITIES.includes(priority) ? priority : DEFAULT_PRIORITY,
    }));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CAPTURE_DEFAULTS_EVENT));
}

export { DEFAULT_PRIORITY, PRIORITIES, STORAGE_KEY };
