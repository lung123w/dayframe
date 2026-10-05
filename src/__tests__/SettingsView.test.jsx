import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../api', () => ({
  settingsService: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
  },
}));

import { settingsService } from '../api';
import SettingsView from '../components/SettingsView';
import { ALL_VIEWS } from '../components/viewVisibility';

/**
 * The Settings page contract (`view-visibility-configuration` design.md
 * D7/D8/D10; ADR-018). The harness owns the visible set like `App.jsx` does, so
 * the optimistic update, the refusal and the revert are observable as rendered
 * state — not just as mock calls.
 */

function Harness({ initial }) {
  const [views, setViews] = useState(initial);
  return <SettingsView visibleViews={views} onVisibleViewsChange={setViews} />;
}

function renderPage(initial = ALL_VIEWS) {
  return render(<Harness initial={initial} />);
}

function switchFor(label) {
  return screen.getByRole('switch', { name: `Show ${label} in the navigation` });
}

function rowFor(label) {
  return switchFor(label).closest('li');
}

describe('SettingsView — the page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsService.get.mockImplementation(() => Promise.resolve(null));
    settingsService.set.mockImplementation(() => Promise.resolve());
  });

  it('renders the frozen copy: heading, context line, section and caption', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Choose which views appear in the navigation.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navigation' })).toBeInTheDocument();
    expect(screen.getByText('Visibility only — the order of the views is fixed.')).toBeInTheDocument();
  });

  it('renders exactly the six catalogue rows and no seventh control', () => {
    renderPage();

    const labels = screen.getAllByRole('switch').map((el) => el.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Show Today in the navigation',
      'Show Week in the navigation',
      'Show Habits in the navigation',
      'Show Review in the navigation',
      'Show Finance in the navigation',
      'Show Projects in the navigation',
    ]);
    expect(screen.queryByRole('switch', { name: /settings/i })).toBeNull();
    expect(screen.queryByRole('switch', { name: /backup/i })).toBeNull();
    expect(screen.queryByRole('switch', { name: /notifications/i })).toBeNull();
  });

  it('states each row\'s effect with the exact status strings', () => {
    renderPage(['today', 'habits']);

    expect(within(rowFor('Today')).getByText('Shown in the navigation')).toBeInTheDocument();
    expect(within(rowFor('Habits')).getByText('Shown in the navigation')).toBeInTheDocument();
    expect(within(rowFor('Week')).getByText('Hidden from the navigation')).toBeInTheDocument();
    expect(within(rowFor('Finance')).getByText('Hidden from the navigation')).toBeInTheDocument();
    expect(screen.getAllByText('Shown in the navigation')).toHaveLength(2);
    expect(screen.getAllByText('Hidden from the navigation')).toHaveLength(4);
  });

  it('marks each switch with role="switch" and its visibility in aria-checked', () => {
    renderPage(['review']);

    expect(switchFor('Review')).toHaveAttribute('aria-checked', 'true');
    expect(switchFor('Today')).toHaveAttribute('aria-checked', 'false');
  });

  it('writes the canonical array to the settings key on a permitted toggle', async () => {
    renderPage(ALL_VIEWS);

    fireEvent.click(switchFor('Week'));

    await waitFor(() => {
      expect(settingsService.set).toHaveBeenCalledWith('ui.visibleViews', ['today', 'habits', 'review', 'finance', 'projects']);
    });
    // The optimistic update lands: the row now reads hidden.
    expect(within(rowFor('Week')).getByText('Hidden from the navigation')).toBeInTheDocument();
  });

  it('shows a hidden view again, canonically, when its switch is turned on', async () => {
    renderPage(['review']);

    fireEvent.click(switchFor('Today'));

    await waitFor(() => {
      expect(settingsService.set).toHaveBeenCalledWith('ui.visibleViews', ['today', 'review']);
    });
    expect(within(rowFor('Today')).getByText('Shown in the navigation')).toBeInTheDocument();
  });
});

describe('SettingsView — the guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsService.get.mockImplementation(() => Promise.resolve(null));
    settingsService.set.mockImplementation(() => Promise.resolve());
  });

  it('refuses the last visible view, writes nothing and leaves the switch on', async () => {
    renderPage(['today']);

    fireEvent.click(switchFor('Today'));

    expect(settingsService.set).not.toHaveBeenCalled();
    expect(switchFor('Today')).toHaveAttribute('aria-checked', 'true');
    expect(within(rowFor('Today')).getByText('Shown in the navigation')).toBeInTheDocument();
    expect(
      screen.getByText('At least one view must stay in the navigation. Turn another view on first.'),
    ).toBeInTheDocument();
  });

  it('clears the refusal on the next permitted toggle', async () => {
    renderPage(['today']);

    fireEvent.click(switchFor('Today'));
    expect(screen.getByText(/At least one view must stay/)).toBeInTheDocument();

    fireEvent.click(switchFor('Week'));

    await waitFor(() => {
      expect(settingsService.set).toHaveBeenCalledWith('ui.visibleViews', ['today', 'planner']);
    });
    expect(screen.queryByText(/At least one view must stay/)).toBeNull();
  });

  it('reverts the optimistic toggle and explains when the write rejects', async () => {
    settingsService.set.mockImplementation(() => Promise.reject(new Error('offline')));
    renderPage(ALL_VIEWS);

    fireEvent.click(switchFor('Week'));

    await waitFor(() => {
      expect(screen.getByText('Could not save — the navigation was not changed.')).toBeInTheDocument();
    });
    expect(within(rowFor('Week')).getByText('Shown in the navigation')).toBeInTheDocument();
    expect(screen.getAllByText('Shown in the navigation')).toHaveLength(6);
    expect(switchFor('Week')).toHaveAttribute('aria-checked', 'true');
  });
});
