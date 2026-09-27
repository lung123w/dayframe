import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// The Radix "More" menu measures its content with ResizeObserver, which jsdom
// does not implement. Stub only the shape `@radix-ui/react-use-size` calls.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock the database
vi.mock('../api', () => ({
  taskService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getById: vi.fn(() => Promise.resolve(null)),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve())
  },
  projectService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: 'General', color: '#3788d8' })),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve())
  },
  subtaskService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getByTaskId: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve(1)),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    deleteByTaskId: vi.fn(() => Promise.resolve()),
    toggleCompleted: vi.fn(() => Promise.resolve())
  },
  yearlyGoalService: {
    getByYear: vi.fn(() => Promise.resolve({ goals: [] })),
    save: vi.fn(() => Promise.resolve())
  },
  weeklyObjectiveService: {
    getByWeek: vi.fn(() => Promise.resolve({ objectives: [] })),
    save: vi.fn(() => Promise.resolve())
  },
  weeklyReviewService: {
    getByWeek: vi.fn(() => Promise.resolve({})),
    save: vi.fn(() => Promise.resolve())
  },
  dailyNoteService: {
    getByDate: vi.fn(() => Promise.resolve({ highlights: '', wins: '', improvements: '', tomorrowFocus: '' })),
    save: vi.fn(() => Promise.resolve())
  },
  habitService: {
    getAll: vi.fn(() => Promise.resolve([]))
  },
  habitEntryService: {
    getByHabit: vi.fn(() => Promise.resolve([])),
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve({})),
    deleteByDate: vi.fn(() => Promise.resolve())
  },
  settingsService: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve())
  },
  keyEventService: {
    getAll: vi.fn(() => Promise.resolve([]))
  },
  financialCardService: {
    getAll: vi.fn(() => Promise.resolve([]))
  },
  monthlyReviewService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getCurrent: vi.fn(() => Promise.resolve(null)),
    save: vi.fn(() => Promise.resolve({}))
  },
  workflowStepService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    delete: vi.fn(() => Promise.resolve())
  },
  workflowCompletionService: {
    getForDate: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    deleteByStepAndDate: vi.fn(() => Promise.resolve())
  }
}));

// Mock notifications
vi.mock('../utils/notifications', () => ({
  startNotificationService: vi.fn(() => () => {}),
  requestNotificationPermission: vi.fn()
}));

import App from '../App';

describe('App shell (stage 2 of ui-modernization-calm-canvas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the shell strip with the app name', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('DayFrame')).toBeInTheDocument();
    });
    expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Today/);
  });

  it('opens on the Today view (cold open)', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /navigate to today view/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /navigate to week view/i })).not.toHaveAttribute('aria-current');
  });

  it('keeps the capture line on a non-Today view', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /navigate to habits view/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/quick capture task/i)).toBeInTheDocument();
    });
  });

  it('exposes Finance, Projects, Backup and Notifications from the More menu', async () => {
    render(<App />);

    fireEvent.keyDown(await screen.findByRole('button', { name: /^more$/i }), { key: 'Enter' });

    expect(await screen.findByRole('menuitem', { name: /finance/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /backup/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /notifications/i })).toBeInTheDocument();
  });

  it('reaches Finance through the More menu', async () => {
    render(<App />);

    fireEvent.keyDown(await screen.findByRole('button', { name: /^more$/i }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /finance/i }));

    await waitFor(() => {
      expect(screen.getByTestId('top-strip-title').textContent).toMatch(/Finance/);
    });
  });

  it('focuses the capture line when `/` is pressed in the shell', async () => {
    render(<App />);
    const input = await screen.findByLabelText(/quick capture task/i);

    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    fireEvent.keyDown(document.body, { key: '/' });

    expect(input).toHaveFocus();
    expect(input.value).toBe('');
  });
});
