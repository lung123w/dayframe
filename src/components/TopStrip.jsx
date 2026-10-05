import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FaBell, FaDownload, FaWallet, FaFolder, FaCog, FaChevronDown } from 'react-icons/fa';
import { VIEW_ORDER, VIEW_META, isViewVisible } from './viewVisibility';
import './TopStrip.css';

/**
 * The shell's navigation — a single ~52px top strip (ADR-012, stage 2).
 *
 * Replaces the 220px rail (`Sidebar.jsx` → `TopStrip.jsx`). The four strip
 * destinations (Today · Week · Habits · Review) and the two overflow views
 * (Finance · Projects) are filtered by the visibility preference, so the strip
 * carries only the views the user kept visible (ADR-018); the More overflow
 * additionally always holds Settings — the one entry point to the controls that
 * can turn the others back on — plus Backup and Notifications, none of which
 * any preference can remove.
 *
 * The six `activeView` values are unchanged and no router is introduced — this
 * component only calls `onNavigate(view)`. `settings` is a shell value, not a
 * seventh destination.
 */

/** The four top-strip destinations, in canonical order (from the catalogue, D2). */
const STRIP_VIEWS = VIEW_ORDER.filter((view) => VIEW_META[view].placement === 'strip');

/** The two overflow destinations and the icons they keep in this component. */
const MORE_VIEWS = VIEW_ORDER.filter((view) => VIEW_META[view].placement === 'more');
const MORE_ICONS = { finance: FaWallet, projects: FaFolder };

/** Page title per view — the period the view shows, as far as the shell can know it.
 *  `settings` is a shell value (D1): it has a title and marks no destination active. */
const VIEW_TITLES = {
  today: 'Today',
  planner: 'Week',
  habits: 'Habits',
  review: 'Review',
  finance: 'Finance',
  projects: 'Projects',
  settings: 'Settings',
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Hong Kong local date, computed at render time — never hardcoded. */
function formatLongDate(date) {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function TopStrip({ currentView, onNavigate, onNotifications, onBackup, visibleViews }) {
  const todayLabel = formatLongDate(new Date());
  const viewTitle = VIEW_TITLES[currentView] || 'DayFrame';
  // Null/absent `visibleViews` means every view is visible — the value App.jsx
  // holds during its boot round trip (D5/D11), never a settled state.
  const stripDestinations = STRIP_VIEWS.filter((view) => isViewVisible(visibleViews, view));
  const moreDestinations = MORE_VIEWS.filter((view) => isViewVisible(visibleViews, view));

  return (
    <header className="top-strip">
      <div className="top-strip-title">
        <span className="top-strip-brand">DayFrame</span>
        <span className="top-strip-date" data-testid="top-strip-title">
          {viewTitle} · {todayLabel}
        </span>
      </div>

      <nav className="top-strip-nav" aria-label="Main navigation">
        {stripDestinations.map((view) => (
          <button
            key={view}
            type="button"
            className={`top-strip-link${currentView === view ? ' active' : ''}`}
            onClick={() => onNavigate(view)}
            aria-label={VIEW_META[view].ariaLabel}
            aria-current={currentView === view ? 'page' : undefined}
          >
            {VIEW_META[view].label}
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
              {moreDestinations.map((view) => {
                const Icon = MORE_ICONS[view];
                return (
                  <DropdownMenu.Item key={view} className="top-strip-menu-item" onSelect={() => onNavigate(view)}>
                    <Icon className="top-strip-menu-icon" aria-hidden="true" />
                    {VIEW_META[view].label}
                  </DropdownMenu.Item>
                );
              })}
              {moreDestinations.length ? <DropdownMenu.Separator className="top-strip-menu-separator" /> : null}
              {/* Settings is unconditional — the one way back to the controls
                  that can turn the other views on again (D1/D6). Order: the
                  visible overflow destinations, separator, Settings, Backup,
                  Notifications. */}
              <DropdownMenu.Item className="top-strip-menu-item" onSelect={() => onNavigate('settings')}>
                <FaCog className="top-strip-menu-icon" aria-hidden="true" />
                Settings
              </DropdownMenu.Item>
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
