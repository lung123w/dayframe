import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';

// Radix measures its content with ResizeObserver, which jsdom does not
// implement. Stub only the shape `@radix-ui/react-use-size` calls.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../api', () => ({
  taskService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getById: vi.fn(() => Promise.resolve(null)),
    create: vi.fn(() => Promise.resolve({ id: 99 })),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve()),
  },
  projectService: {
    getAll: vi.fn(() => Promise.resolve([{ id: 1, name: 'General', color: '#3788d8' }])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: 'General', color: '#3788d8' })),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve()),
  },
  subtaskService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getByTaskId: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve(1)),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    deleteByTaskId: vi.fn(() => Promise.resolve()),
    toggleCompleted: vi.fn(() => Promise.resolve()),
  },
  yearlyGoalService: {
    getByYear: vi.fn(() => Promise.resolve({ goals: '[]', images: '[]' })),
    save: vi.fn(() => Promise.resolve()),
  },
  weeklyObjectiveService: {
    getByWeek: vi.fn(() => Promise.resolve({ objectives: [] })),
    save: vi.fn(() => Promise.resolve()),
  },
  weeklyReviewService: {
    getByWeek: vi.fn(() => Promise.resolve({
      weekStart: null,
      cleanupTasks: [],
      gratitudeEntries: [],
      reflectionAnswers: {},
      weeklyGoals: [],
      syncFlags: {},
    })),
    save: vi.fn(() => Promise.resolve()),
  },
  dailyNoteService: {
    getByDate: vi.fn(() => Promise.resolve({ highlights: '' })),
    save: vi.fn(() => Promise.resolve()),
  },
  habitService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  habitEntryService: {
    getByHabit: vi.fn(() => Promise.resolve([])),
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve({})),
    deleteByDate: vi.fn(() => Promise.resolve()),
  },
  settingsService: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
  },
  keyEventService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  financialCardService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  monthlyReviewService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getCurrent: vi.fn(() => Promise.resolve(null)),
    save: vi.fn(() => Promise.resolve({})),
  },
  workflowStepService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    delete: vi.fn(() => Promise.resolve()),
  },
  workflowCompletionService: {
    getForDate: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    deleteByStepAndDate: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../utils/notifications', () => ({
  startNotificationService: vi.fn(() => () => {}),
  requestNotificationPermission: vi.fn(),
}));

import { settingsService } from '../api';
import App from '../App';

/**
 * The App-level acceptance surface of `view-visibility-configuration`
 * (design.md D5/D9/D11/D12): the navigation, the More menu, the keyboard chord
 * and the palette all respect the stored visible set, and the boot gate never
 * paints a destination that is about to disappear.
 */

/** Mock `settingsService.get` per case; every other key keeps its default. */
function setPreference(value) {
  settingsService.get.mockImplementation((key) => (
    key === 'ui.visibleViews' ? Promise.resolve(value) : Promise.resolve(null)
  ));
}

function key(k, options = {}) {
  fireEvent.keyDown(document.body, { key: k, ...options });
}

async function openMore() {
  fireEvent.keyDown(await screen.findByRole('button', { name: /^more$/i }), { key: 'Enter' });
}

function stripTab(name) {
  return screen.queryByRole('button', { name });
}

const TODAY_TAB = /navigate to today view/i;
const WEEK_TAB = /navigate to week view/i;
const HABITS_TAB = /navigate to habits view/i;
const REVIEW_TAB = /navigate to weekly review view/i;

describe('view visibility — the shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setPreference(null);
  });

  it('paints nothing while the preference is still being read (D5 gate)', async () => {
    let resolveRead;
    settingsService.get.mockImplementation((key) => {
      if (key === 'ui.visibleViews') {
        return new Promise((resolve) => { resolveRead = resolve; });
      }
      return Promise.resolve(null);
    });

    const { container } = render(<App />);

    // Synchronously after render — the boot read has not settled.
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('top-strip-title')).toBeNull();

    await act(async () => { resolveRead(null); });

    await waitFor(() => {
      expect(screen.getByTestId('top-strip-title')).toBeInTheDocument();
    });
  });

  it('renders only the visible tabs in the top strip', async () => {
    setPreference(['today', 'habits']);
    render(<App />);

    expect(await screen.findByRole('button', { name: TODAY_TAB })).toBeInTheDocument();
    expect(stripTab(HABITS_TAB)).toBeInTheDocument();
    expect(stripTab(WEEK_TAB)).toBeNull();
    expect(stripTab(REVIEW_TAB)).toBeNull();
  });

  it('drops a hidden Finance/Projects from the More menu but keeps Settings, Backup and Notifications', async () => {
    setPreference(['today', 'planner', 'habits', 'review']);
    render(<App />);

    await screen.findByRole('button', { name: TODAY_TAB });
    await openMore();

    expect(await screen.findByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /backup/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /finance/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /projects/i })).toBeNull();
  });

  it('renders all six views when the preference is unset', async () => {
    setPreference(null);
    render(<App />);

    await screen.findByRole('button', { name: TODAY_TAB });
    expect(stripTab(WEEK_TAB)).toBeInTheDocument();
    expect(stripTab(HABITS_TAB)).toBeInTheDocument();
    expect(stripTab(REVIEW_TAB)).toBeInTheDocument();

    await openMore();
    expect(await screen.findByRole('menuitem', { name: /finance/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /projects/i })).toBeInTheDocument();
  });

  it('renders all six views when the preference is malformed', async () => {
    setPreference('today');
    render(<App />);

    await screen.findByRole('button', { name: TODAY_TAB });
    expect(stripTab(WEEK_TAB)).toBeInTheDocument();
    expect(stripTab(HABITS_TAB)).toBeInTheDocument();
    expect(stripTab(REVIEW_TAB)).toBeInTheDocument();
  });

  it('lands on the first visible view with Today hidden, and renders no hidden destination', async () => {
    setPreference(['habits', 'review']);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Habits/);
    });

    expect(stripTab(TODAY_TAB)).toBeNull();
    expect(stripTab(WEEK_TAB)).toBeNull();
    expect(stripTab(REVIEW_TAB)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: HABITS_TAB })).toHaveAttribute('aria-current', 'page');
  });

  it('ignores the g chord for a hidden view and still navigates for a visible one', async () => {
    setPreference(['today', 'planner', 'habits', 'review', 'projects']);
    render(<App />);

    await screen.findByRole('button', { name: TODAY_TAB });

    // A visible view navigates.
    key('g');
    key('h');
    await waitFor(() => {
      expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Habits/);
    });

    // Finance is hidden: the chord changes nothing and consumes nothing.
    const arm = new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true });
    document.body.dispatchEvent(arm);
    const hidden = new KeyboardEvent('keydown', { key: 'f', bubbles: true, cancelable: true });
    document.body.dispatchEvent(hidden);

    expect(hidden.defaultPrevented).toBe(false);
    expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Habits/);

    // …and a visible letter still works.
    key('g');
    key('t');
    await waitFor(() => {
      expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Today/);
    });
  });

  it('lists no hidden view in the palette and omits its shortcut from the footer', async () => {
    setPreference(['today', 'planner', 'habits', 'review']);
    render(<App />);

    await screen.findByRole('button', { name: TODAY_TAB });
    key('k', { ctrlKey: true });

    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    const options = within(dialog).getAllByRole('option');
    const labels = options.map((option) => option.textContent);

    expect(options).toHaveLength(5);
    expect(labels.some((label) => label.includes('Finance'))).toBe(false);
    expect(labels.some((label) => label.includes('Projects'))).toBe(false);
    expect(labels.some((label) => label.includes('Go to Habits'))).toBe(true);
    expect(labels.some((label) => label.includes('Focus the capture line'))).toBe(true);

    const footer = dialog.querySelector('.command-palette-footer');
    expect(footer).not.toBeNull();
    expect(within(footer).getByText('g → t / w / h / r')).toBeInTheDocument();
    expect(within(footer).queryByText('Finance')).toBeNull();
    expect(within(footer).queryByText('Projects')).toBeNull();
  });

  it('still reaches Settings with a single visible view, and stays on the page', async () => {
    setPreference(['today']);
    render(<App />);

    await screen.findByRole('button', { name: TODAY_TAB });
    await openMore();
    expect(await screen.findByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /backup/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /projects/i })).toBeNull();

    fireEvent.click(screen.getByRole('menuitem', { name: /settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    });

    // D9 — the fallback does not bounce off the shell value.
    expect(screen.getAllByRole('switch')).toHaveLength(6);
    expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Settings/);
    // A configuration page is not a capture surface, and marks no destination active.
    expect(screen.queryByLabelText(/quick capture task/i)).toBeNull();
    expect(screen.getByRole('button', { name: TODAY_TAB })).not.toHaveAttribute('aria-current');
  });

  it('persists a toggle through the settings key and renders the same set on the next load', async () => {
    setPreference(null);
    const first = render(<App />);

    await screen.findByRole('button', { name: TODAY_TAB });
    await openMore();
    fireEvent.click(await screen.findByRole('menuitem', { name: /settings/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('switch')).toHaveLength(6);
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Show Week in the navigation' }));

    await waitFor(() => {
      expect(settingsService.set).toHaveBeenCalledWith('ui.visibleViews', ['today', 'habits', 'review', 'finance', 'projects']);
    });

    first.unmount();

    // "Reload": the next boot reads the persisted array back.
    setPreference(['today', 'habits', 'review', 'finance', 'projects']);
    render(<App />);

    await screen.findByRole('button', { name: TODAY_TAB });
    expect(stripTab(WEEK_TAB)).toBeNull();
    expect(stripTab(HABITS_TAB)).toBeInTheDocument();
  });
});
