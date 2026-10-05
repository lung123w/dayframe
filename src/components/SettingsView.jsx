import React, { useState } from 'react';
import { VIEW_ORDER, VIEW_META, SETTINGS_KEY, normalizeVisibleViews } from './viewVisibility';
import { settingsService } from '../api';
import './SettingsView.css';

/**
 * The Settings page — `view-visibility-configuration` (design.md D7/D8/D10;
 * ADR-018). A shell value (`activeView === 'settings'`), never a seventh
 * navigation destination: it is reachable only from the More ▾ menu, which no
 * preference can hide (D1/D6).
 *
 * The page is deliberately a status page, not an admin screen: one heading, one
 * line of context, the six `VIEW_ORDER` rows, and one caption recording that
 * reordering is out of scope. The switch rows are generated from `VIEW_ORDER`
 * (six ids, never `settings`), so the never-hideable set — the More menu itself,
 * Settings, Backup, Notifications — has no control to render.
 *
 * The three behaviour strings are frozen by design.md and asserted verbatim by
 * `src/__tests__/SettingsView.test.jsx`.
 */

const REFUSAL_TEXT = 'At least one view must stay in the navigation. Turn another view on first.';
const WRITE_ERROR_TEXT = 'Could not save — the navigation was not changed.';
const SHOWN_TEXT = 'Shown in the navigation';
const HIDDEN_TEXT = 'Hidden from the navigation';

export default function SettingsView({ visibleViews, onVisibleViewsChange }) {
  // The one-line explanation (D7 refusal / D8 write failure), scoped to the row
  // it concerns so it renders beside the switch that produced it.
  const [message, setMessage] = useState(null);
  const visible = normalizeVisibleViews(visibleViews);

  const handleToggle = async (view) => {
    const isVisible = visible.includes(view);

    // D7 — the only refusing state is a visible set of size one: the toggle
    // writes nothing, the switch stays on, and the refusal is explained.
    if (isVisible && visible.length === 1) {
      setMessage({ view, kind: 'refusal', text: REFUSAL_TEXT });
      return;
    }

    const next = normalizeVisibleViews(isVisible ? visible.filter((v) => v !== view) : [...visible, view]);
    setMessage(null);
    onVisibleViewsChange(next);

    try {
      await settingsService.set(SETTINGS_KEY, next);
    } catch {
      // D8 — a rejected write reverts the optimistic state and says so.
      onVisibleViewsChange(visible);
      setMessage({ view, kind: 'error', text: WRITE_ERROR_TEXT });
    }
  };

  return (
    <div className="settings-view">
      <header className="settings-view-header">
        <h1 className="settings-view-title">Settings</h1>
        <p className="settings-view-subtitle">Choose which views appear in the navigation.</p>
      </header>

      <section className="settings-view-section" aria-labelledby="settings-navigation-heading">
        <h2 className="settings-view-section-title" id="settings-navigation-heading">Navigation</h2>

        <ul className="settings-view-list">
          {VIEW_ORDER.map((view) => {
            const meta = VIEW_META[view];
            const isVisible = visible.includes(view);
            return (
              <li key={view} className="settings-view-row">
                <div className="settings-view-row-text">
                  <span className="settings-view-row-label">{meta.label}</span>
                  <span className="settings-view-row-status">
                    {isVisible ? SHOWN_TEXT : HIDDEN_TEXT}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isVisible}
                  aria-label={`Show ${meta.label} in the navigation`}
                  className="settings-view-switch"
                  onClick={() => handleToggle(view)}
                >
                  <span className="settings-view-switch-thumb" aria-hidden="true" />
                </button>

                {message && message.view === view ? (
                  <p
                    className={`settings-view-message settings-view-message--${message.kind}`}
                    role="status"
                  >
                    {message.text}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="settings-view-caption">Visibility only — the order of the views is fixed.</p>
      </section>
    </div>
  );
}
