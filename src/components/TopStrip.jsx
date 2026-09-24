import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FaBell, FaDownload, FaWallet, FaFolder, FaChevronDown } from 'react-icons/fa';
import './TopStrip.css';

/**
 * The shell's navigation — a single ~52px top strip (ADR-012, stage 2).
 *
 * Replaces the 220px rail (`Sidebar.jsx` → `TopStrip.jsx`). Four destinations
 * are visible as text (Today · Week · Habits · Review) and the remaining two
 * views plus the two tools live in the "More" overflow, so the whole
 * navigation is a single responsive row instead of the rail's
 * `display: none` dead end below 768px (audit F16, `Sidebar.css:93-98`).
 *
 * The six `activeView` values are unchanged and no router is introduced —
 * this component only calls `onNavigate(view)`.
 */

const DESTINATIONS = [
  { view: 'today', label: 'Today', ariaLabel: 'Navigate to Today view' },
  { view: 'planner', label: 'Week', ariaLabel: 'Navigate to Week view' },
  { view: 'habits', label: 'Habits', ariaLabel: 'Navigate to Habits view' },
  { view: 'review', label: 'Review', ariaLabel: 'Navigate to Weekly Review view' },
];

/** Page title per view — the period the view shows, as far as the shell can know it. */
const VIEW_TITLES = {
  today: 'Today',
  planner: 'Week',
  habits: 'Habits',
  review: 'Review',
  finance: 'Finance',
  projects: 'Projects',
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Hong Kong local date, computed at render time — never hardcoded. */
function formatLongDate(date) {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function TopStrip({ currentView, onNavigate, onNotifications, onBackup }) {
  const todayLabel = formatLongDate(new Date());
  const viewTitle = VIEW_TITLES[currentView] || 'DayFrame';

  return (
    <header className="top-strip">
      <div className="top-strip-title">
        <span className="top-strip-brand">DayFrame</span>
        <span className="top-strip-date" data-testid="top-strip-title">
          {viewTitle} · {todayLabel}
        </span>
      </div>

      <nav className="top-strip-nav" aria-label="Main navigation">
        {DESTINATIONS.map(({ view, label, ariaLabel }) => (
          <button
            key={view}
            type="button"
            className={`top-strip-link${currentView === view ? ' active' : ''}`}
            onClick={() => onNavigate(view)}
            aria-label={ariaLabel}
            aria-current={currentView === view ? 'page' : undefined}
          >
            {label}
          </button>
        ))}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="top-strip-link top-strip-more">
              More
              <FaChevronDown className="top-strip-more-caret" aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="top-strip-menu" sideOffset={6} align="end">
              <DropdownMenu.Item className="top-strip-menu-item" onSelect={() => onNavigate('finance')}>
                <FaWallet className="top-strip-menu-icon" aria-hidden="true" />
                Finance
              </DropdownMenu.Item>
              <DropdownMenu.Item className="top-strip-menu-item" onSelect={() => onNavigate('projects')}>
                <FaFolder className="top-strip-menu-icon" aria-hidden="true" />
                Projects
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="top-strip-menu-separator" />
              <DropdownMenu.Item className="top-strip-menu-item" onSelect={onBackup}>
                <FaDownload className="top-strip-menu-icon" aria-hidden="true" />
                Backup
              </DropdownMenu.Item>
              <DropdownMenu.Item className="top-strip-menu-item" onSelect={onNotifications}>
                <FaBell className="top-strip-menu-icon" aria-hidden="true" />
                Notifications
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </nav>
    </header>
  );
}
