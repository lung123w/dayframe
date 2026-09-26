import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Radix measures popover content with a ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };

vi.mock('../api', () => ({
  habitService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  habitEntryService: {
    getByHabit: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve()),
    deleteByDate: vi.fn(() => Promise.resolve()),
  },
  workflowStepService: { getAll: vi.fn(() => Promise.resolve([])) },
  workflowCompletionService: { getForDate: vi.fn(() => Promise.resolve([])) },
}));

import { habitService, habitEntryService } from '../api';
import PlannerHabitsPanel from '../components/PlannerHabitsPanel';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('PlannerHabitsPanel', () => {
  const onDataChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    habitService.getAll.mockResolvedValue([]);
    habitEntryService.getByHabit.mockResolvedValue([]);
  });

  async function renderExpanded() {
    const view = render(<PlannerHabitsPanel onDataChange={onDataChange} />);
    const rail = await screen.findByRole('button', { name: /today habits/i });
    fireEvent.click(rail);
    return view;
  }

  it('collapses to one "N of M done" line until it is activated', async () => {
    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Read', isArchived: false }]);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);

    await waitFor(() => {
      expect(screen.getByText('0 of 1 done')).toBeInTheDocument();
    });
    // The per-habit rows are not rendered until the rail is activated.
    expect(screen.queryByText('Read')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /today habits/i }));

    await waitFor(() => {
      expect(screen.getByText('Read')).toBeInTheDocument();
    });
  });

  it('renders empty state when no habits exist', async () => {
    await renderExpanded();

    await waitFor(() => {
      expect(screen.getByText(/no habits for today/i)).toBeInTheDocument();
    });
  });

  it('renders active habits and hides archived ones', async () => {
    const today = todayStr();
    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Read', isArchived: false },
      { id: 2, name: 'Old Habit', isArchived: true },
    ]);
    habitEntryService.getByHabit.mockImplementation((id) => {
      if (id === 1) return Promise.resolve([{ id: 10, date: today }]);
      return Promise.resolve([]);
    });

    await renderExpanded();

    await waitFor(() => {
      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.queryByText('Old Habit')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Unmark Read' })).toBeInTheDocument();
    });
  });

  it('writes the day with zero minutes on a single activation (one POST, never two)', async () => {
    const today = todayStr();
    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    await renderExpanded();

    const toggle = await screen.findByRole('button', { name: 'Mark Write done' });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, timeSpentSeconds: 0 });
      expect(onDataChange).toHaveBeenCalled();
    });
    expect(habitEntryService.create).toHaveBeenCalledTimes(1);
    expect(habitEntryService.deleteByDate).not.toHaveBeenCalled();
  });

  it('unmarks the day when an already-done row is activated', async () => {
    const today = todayStr();

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Exercise', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([{ id: 33, date: today }]);

    await renderExpanded();

    fireEvent.click(await screen.findByRole('button', { name: 'Unmark Exercise' }));

    await waitFor(() => {
      expect(habitEntryService.deleteByDate).toHaveBeenCalledWith(1, today);
      expect(onDataChange).toHaveBeenCalled();
    });
    expect(habitEntryService.create).not.toHaveBeenCalled();
  });

  it('refines the duration with a PUT on the existing entry — never a second POST', async () => {
    const today = todayStr();

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([{ id: 33, date: today, timeSpentSeconds: 0 }]);

    await renderExpanded();

    fireEvent.click(await screen.findByRole('button', { name: 'Time' }));

    await waitFor(() => {
      expect(screen.getByText(/time spent \(minutes\)/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(habitEntryService.update).toHaveBeenCalledWith(33, { timeSpentSeconds: 900 });
    });
    expect(habitEntryService.create).not.toHaveBeenCalled();
  });

  it('keeps the popover out of the logging path — activation writes immediately', async () => {
    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    await renderExpanded();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark Write done' }));

    expect(screen.queryByText(/time spent \(minutes\)/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalledTimes(1);
    });
  });

  it('prevents a second activation from writing twice while the first is in flight', async () => {
    const today = todayStr();
    let resolveCreate;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);
    habitEntryService.create.mockReturnValue(createPromise);

    await renderExpanded();

    const toggle = await screen.findByRole('button', { name: 'Mark Write done' });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(habitEntryService.create).toHaveBeenCalledTimes(1);
    expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, timeSpentSeconds: 0 });

    resolveCreate({ id: 1 });

    await waitFor(() => {
      expect(onDataChange).toHaveBeenCalled();
    });
  });

  it('does not call onDataChange if the write resolves after unmount', async () => {
    let resolveCreate;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit.mockResolvedValue([]);
    habitEntryService.create.mockReturnValue(createPromise);

    const { unmount } = await renderExpanded();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark Write done' }));

    expect(habitEntryService.create).toHaveBeenCalledTimes(1);

    unmount();
    resolveCreate({ id: 1 });

    await Promise.resolve();
    await Promise.resolve();

    expect(onDataChange).not.toHaveBeenCalled();
  });

  it('ignores stale in-flight loadData responses that resolve out of order', async () => {
    const today = todayStr();
    let resolveFirstEntries;
    const firstEntriesPromise = new Promise((resolve) => {
      resolveFirstEntries = resolve;
    });

    habitService.getAll.mockResolvedValue([{ id: 1, name: 'Write', isArchived: false }]);
    habitEntryService.getByHabit
      .mockImplementationOnce(() => firstEntriesPromise)
      .mockResolvedValue([{ id: 77, date: today, timeSpentSeconds: 300 }]);

    render(<PlannerHabitsPanel onDataChange={onDataChange} />);
    fireEvent.click(await screen.findByRole('button', { name: /today habits/i }));

    fireEvent.click(await screen.findByRole('button', { name: 'Mark Write done' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Unmark Write' })).toBeInTheDocument();
    });

    resolveFirstEntries([]);

    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByRole('button', { name: 'Unmark Write' })).toBeInTheDocument();
  });

  it('logs a count habit through the same one-click path (the value stays inert per ADR-011)', async () => {
    const today = todayStr();

    habitService.getAll.mockResolvedValue([
      { id: 1, name: 'Push-ups', isArchived: false, trackType: 'count' },
    ]);
    habitEntryService.getByHabit.mockResolvedValue([]);

    await renderExpanded();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark Push-ups done' }));

    await waitFor(() => {
      expect(habitEntryService.create).toHaveBeenCalledWith({ habitId: 1, date: today, count: 0 });
    });
    expect(habitEntryService.create).toHaveBeenCalledTimes(1);
  });
});
